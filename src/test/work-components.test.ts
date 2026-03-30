import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  getAvailableColumns,
  getExtraValue,
  loadSelectedColumns,
  saveSelectedColumns,
} from '@/components/work/WorkColumnSelector';
import WorkExtraCell from '@/components/work/WorkExtraCell';
import type { MyWorkItem, ExtraColumnValue } from '@/hooks/useMyWorkItems';

// ── WorkColumnSelector utilities ────────────────────────────────────────────

function makeWorkItem(extras: ExtraColumnValue[] = []): MyWorkItem {
  return {
    id: 'item1',
    name: 'Test Item',
    boardId: 'b1',
    boardName: 'Board',
    groupId: 'g1',
    groupTitle: 'Group',
    groupColor: '#ccc',
    position: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    people: [],
    extraColumns: extras,
  };
}

describe('getAvailableColumns', () => {
  it('returns empty array for items with no extra columns', () => {
    expect(getAvailableColumns([makeWorkItem()])).toEqual([]);
  });

  it('aggregates unique columns by title::type key', () => {
    const item1 = makeWorkItem([
      { columnTitle: 'Status', columnType: 'status', value: 'done' },
      { columnTitle: 'Priority', columnType: 'dropdown', value: 'high' },
    ]);
    const item2 = makeWorkItem([
      { columnTitle: 'Status', columnType: 'status', value: 'active' },
      { columnTitle: 'Effort', columnType: 'number', value: 5 },
    ]);
    const result = getAvailableColumns([item1, item2]);
    expect(result).toHaveLength(3);
    const keys = result.map(r => r.key);
    expect(keys).toContain('status::status');
    expect(keys).toContain('priority::dropdown');
    expect(keys).toContain('effort::number');
  });

  it('sorts results alphabetically by title', () => {
    const item = makeWorkItem([
      { columnTitle: 'Zebra', columnType: 'text', value: 'z' },
      { columnTitle: 'Alpha', columnType: 'text', value: 'a' },
    ]);
    const result = getAvailableColumns([item]);
    expect(result[0].title).toBe('Alpha');
    expect(result[1].title).toBe('Zebra');
  });

  it('handles items without extraColumns property', () => {
    const item: MyWorkItem = {
      id: 'x', name: 'X', boardId: 'b', boardName: 'B',
      groupId: null, groupTitle: 'G', groupColor: '#000',
      position: 0, createdAt: '', updatedAt: '', people: [],
    };
    expect(getAvailableColumns([item])).toEqual([]);
  });
});

describe('getExtraValue', () => {
  it('returns matching extra column value', () => {
    const item = makeWorkItem([
      { columnTitle: 'Priority', columnType: 'dropdown', value: 'high', settings: { options: ['low', 'high'] } },
    ]);
    const result = getExtraValue(item, 'priority::dropdown');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('high');
    expect(result!.type).toBe('dropdown');
  });

  it('returns null for non-matching key', () => {
    const item = makeWorkItem([
      { columnTitle: 'Priority', columnType: 'dropdown', value: 'high' },
    ]);
    expect(getExtraValue(item, 'status::status')).toBeNull();
  });

  it('returns null when item has no extraColumns', () => {
    const item: MyWorkItem = {
      id: 'x', name: 'X', boardId: 'b', boardName: 'B',
      groupId: null, groupTitle: 'G', groupColor: '#000',
      position: 0, createdAt: '', updatedAt: '', people: [],
    };
    expect(getExtraValue(item, 'anything::text')).toBeNull();
  });
});

describe('loadSelectedColumns / saveSelectedColumns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when nothing stored', () => {
    expect(loadSelectedColumns('mywork')).toEqual([]);
  });

  it('saves and loads columns', () => {
    const keys = ['status::status', 'priority::dropdown'];
    saveSelectedColumns('mywork', keys);
    expect(loadSelectedColumns('mywork')).toEqual(keys);
  });

  it('separates mywork and teamwork', () => {
    saveSelectedColumns('mywork', ['a']);
    saveSelectedColumns('teamwork', ['b']);
    expect(loadSelectedColumns('mywork')).toEqual(['a']);
    expect(loadSelectedColumns('teamwork')).toEqual(['b']);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('lfpro-work-columns-mywork', 'not-json');
    expect(loadSelectedColumns('mywork')).toEqual([]);
  });
});

// ── WorkExtraCell rendering ─────────────────────────────────────────────────

describe('WorkExtraCell', () => {
  it('renders -- for null value', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: null, type: 'text' }));
    expect(container.textContent).toBe('--');
  });

  it('renders -- for empty string', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: '', type: 'text' }));
    expect(container.textContent).toBe('--');
  });

  it('renders text type', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'Hello', type: 'text' }));
    expect(container.textContent).toBe('Hello');
  });

  it('renders number formatted with locale', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 1234, type: 'number' }));
    // May vary by locale, but should contain "1" and "234"
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('234');
  });

  it('renders NaN number as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'abc', type: 'number' }));
    expect(container.textContent).toBe('--');
  });

  it('renders checkbox true as check icon', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: true, type: 'checkbox' }));
    // Check icon should be an SVG
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders checkbox false as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: false, type: 'checkbox' }));
    expect(container.textContent).toBe('--');
  });

  it('renders rating as stars', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 3, type: 'rating' }));
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(3);
  });

  it('renders rating 0 as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 0, type: 'rating' }));
    expect(container.textContent).toBe('--');
  });

  it('renders progress bar', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 75, type: 'progress' }));
    expect(container.textContent).toContain('75%');
  });

  it('renders tags array', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: ['bug', 'feature', 'urgent'], type: 'tags' }));
    expect(container.textContent).toContain('bug');
    expect(container.textContent).toContain('feature');
    expect(container.textContent).toContain('+1');
  });

  it('renders tags from comma-separated string', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'a, b', type: 'tags' }));
    expect(container.textContent).toContain('a');
    expect(container.textContent).toContain('b');
  });

  it('renders empty tags as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: [], type: 'tags' }));
    expect(container.textContent).toBe('--');
  });

  it('renders link as anchor', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'https://example.com', type: 'link' }));
    const anchor = container.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe('https://example.com');
  });

  it('renders link object with text', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { url: 'https://x.com', text: 'Link' }, type: 'link' }));
    const anchor = container.querySelector('a');
    expect(anchor!.textContent).toBe('Link');
  });

  it('renders time_tracking with hours and minutes', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { totalSeconds: 3660, sessions: [], runningFrom: null }, type: 'time_tracking' }));
    expect(container.textContent).toContain('1h');
    expect(container.textContent).toContain('01m');
  });

  it('renders time_tracking running state with play icon', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { totalSeconds: 60, sessions: [], runningFrom: '2024-01-01T10:00:00' }, type: 'time_tracking' }));
    // Should have a play SVG icon
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders time_tracking zero as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { totalSeconds: 0, sessions: [], runningFrom: null }, type: 'time_tracking' }));
    expect(container.textContent).toBe('--');
  });

  it('renders dropdown object with values array', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { values: ['Option A', 'Option B'] }, type: 'dropdown' }));
    expect(container.textContent).toBe('Option A, Option B');
  });

  it('renders dropdown simple string', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'High', type: 'dropdown' }));
    expect(container.textContent).toBe('High');
  });

  it('renders color swatch', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: '#ff0000', type: 'color' }));
    const swatch = container.querySelector('span[style]');
    expect(swatch).toBeTruthy();
  });

  it('renders timeline with arrow', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { start: '2024-01-01', end: '2024-06-30' }, type: 'timeline' }));
    expect(container.textContent).toContain('2024-01-01');
    expect(container.textContent).toContain('2024-06-30');
  });

  it('renders auto_number', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 42, type: 'auto_number' }));
    expect(container.textContent).toBe('42');
  });

  it('renders creation_log date only', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { date: '2024-06-15T10:00:00Z' }, type: 'creation_log' }));
    expect(container.textContent).toBe('2024-06-15');
  });

  it('renders vote count', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: ['u1', 'u2', 'u3'], type: 'vote' }));
    expect(container.textContent).toContain('3');
  });

  it('renders vote zero as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: [], type: 'vote' }));
    expect(container.textContent).toBe('--');
  });

  it('renders location address', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { address: 'New York' }, type: 'location' }));
    expect(container.textContent).toBe('New York');
  });

  it('renders file with paperclip', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: [{ name: 'doc.pdf' }], type: 'file' }));
    expect(container.textContent).toContain('doc.pdf');
  });

  it('renders formula number', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 42.5, type: 'formula' }));
    // Should be locale-formatted
    expect(container.textContent).toBeTruthy();
  });

  it('renders connect_boards as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: ['id1'], type: 'connect_boards' }));
    expect(container.textContent).toBe('--');
  });

  it('renders unknown type with string fallback', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'custom', type: 'custom_type' as any }));
    expect(container.textContent).toBe('custom');
  });

  it('renders unknown type object with label', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: { label: 'My Label' }, type: 'unknown_type' as any }));
    expect(container.textContent).toBe('My Label');
  });

  it('renders "null" string as --', () => {
    const { container } = render(React.createElement(WorkExtraCell, { value: 'null', type: 'text' }));
    expect(container.textContent).toBe('--');
  });
});
