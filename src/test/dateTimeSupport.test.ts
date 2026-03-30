import { describe, it, expect } from 'vitest';
import { parseDateValue, serializeDateValue } from '@/components/board/DateCell';

// ---- parseDateValue ----
describe('parseDateValue', () => {
  it('handles undefined', () => {
    expect(parseDateValue(undefined)).toEqual({ date: '', startTime: '', endTime: '' });
  });

  it('handles empty string', () => {
    expect(parseDateValue('')).toEqual({ date: '', startTime: '', endTime: '' });
  });

  it('handles simple date string', () => {
    expect(parseDateValue('2026-03-25')).toEqual({ date: '2026-03-25', startTime: '', endTime: '' });
  });

  it('handles quoted date string', () => {
    expect(parseDateValue('"2026-03-25"')).toEqual({ date: '2026-03-25', startTime: '', endTime: '' });
  });

  it('handles datetime string with T separator', () => {
    expect(parseDateValue('2026-03-25T14:30')).toEqual({ date: '2026-03-25', startTime: '14:30', endTime: '' });
  });

  it('handles JSON object with date only', () => {
    const val = JSON.stringify({ date: '2026-03-25' });
    expect(parseDateValue(val)).toEqual({ date: '2026-03-25', startTime: '', endTime: '' });
  });

  it('handles JSON object with startTime only', () => {
    const val = JSON.stringify({ date: '2026-03-25', startTime: '14:00' });
    expect(parseDateValue(val)).toEqual({ date: '2026-03-25', startTime: '14:00', endTime: '' });
  });

  it('handles JSON object with startTime and endTime', () => {
    const val = JSON.stringify({ date: '2026-03-25', startTime: '14:00', endTime: '15:30' });
    expect(parseDateValue(val)).toEqual({ date: '2026-03-25', startTime: '14:00', endTime: '15:30' });
  });
});

// ---- serializeDateValue ----
describe('serializeDateValue', () => {
  it('returns empty string for empty date', () => {
    expect(serializeDateValue('', '', '')).toBe('');
  });

  it('returns simple string for date without time', () => {
    expect(serializeDateValue('2026-03-25', '', '')).toBe('2026-03-25');
  });

  it('returns JSON with startTime only', () => {
    const result = serializeDateValue('2026-03-25', '14:00', '');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ date: '2026-03-25', startTime: '14:00' });
    expect(parsed.endTime).toBeUndefined();
  });

  it('returns JSON with startTime and endTime', () => {
    const result = serializeDateValue('2026-03-25', '14:00', '15:30');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ date: '2026-03-25', startTime: '14:00', endTime: '15:30' });
  });
});

// ---- sortByDate ----
describe('sortByDate logic', () => {
  // Inline the sort function for testing since it's not exported
  function sortByDate<T extends { dateValue?: string; startTime?: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      if (!a.dateValue && !b.dateValue) return 0;
      if (!a.dateValue) return 1;
      if (!b.dateValue) return -1;
      const aKey = a.dateValue + (a.startTime ? `T${a.startTime}` : '');
      const bKey = b.dateValue + (b.startTime ? `T${b.startTime}` : '');
      return aKey.localeCompare(bKey);
    });
  }

  it('sorts items by date ascending', () => {
    const items = [
      { dateValue: '2026-03-28' },
      { dateValue: '2026-03-25' },
      { dateValue: '2026-03-27' },
    ];
    const sorted = sortByDate(items);
    expect(sorted.map(i => i.dateValue)).toEqual(['2026-03-25', '2026-03-27', '2026-03-28']);
  });

  it('puts items without date at the end', () => {
    const items = [
      { dateValue: '2026-03-25' },
      { dateValue: undefined },
      { dateValue: '2026-03-20' },
    ];
    const sorted = sortByDate(items);
    expect(sorted.map(i => i.dateValue)).toEqual(['2026-03-20', '2026-03-25', undefined]);
  });

  it('sorts by time when dates are equal', () => {
    const items = [
      { dateValue: '2026-03-25', startTime: '14:00' },
      { dateValue: '2026-03-25', startTime: '09:00' },
      { dateValue: '2026-03-25' },
    ];
    const sorted = sortByDate(items);
    expect(sorted.map(i => i.startTime)).toEqual([undefined, '09:00', '14:00']);
  });
});

// ---- Round-trip ----
describe('round-trip: serialize then parse', () => {
  it('preserves simple date', () => {
    const serialized = serializeDateValue('2026-03-25', '', '');
    expect(parseDateValue(serialized)).toEqual({ date: '2026-03-25', startTime: '', endTime: '' });
  });

  it('preserves date with startTime', () => {
    const serialized = serializeDateValue('2026-03-25', '14:00', '');
    expect(parseDateValue(serialized)).toEqual({ date: '2026-03-25', startTime: '14:00', endTime: '' });
  });

  it('preserves date with startTime and endTime', () => {
    const serialized = serializeDateValue('2026-03-25', '14:00', '15:30');
    expect(parseDateValue(serialized)).toEqual({ date: '2026-03-25', startTime: '14:00', endTime: '15:30' });
  });
});
