import { describe, it, expect } from 'vitest';
import { evaluateFilterGroup } from '@/components/board/FilterBuilder';
import type { FilterGroup, FilterRule } from '@/components/board/FilterBuilder';
import type { Column } from '@/types/board';

function makeCol(id: string, title: string, type: string): Column {
  return {
    id,
    boardId: 'b1',
    title,
    type: type as any,
    width: 100,
    position: 0,
    settings: {},
  };
}

function makeRule(columnId: string, operator: string, value: any = ''): FilterRule {
  return { id: 'r1', columnId, operator: operator as any, value };
}

function makeGroup(combinator: 'and' | 'or', rules: FilterRule[]): FilterGroup {
  return { combinator, rules };
}

const textCol = makeCol('c_text', 'Name', 'text');
const numberCol = makeCol('c_num', 'Amount', 'number');
const statusCol = makeCol('c_status', 'Status', 'status');
const dateCol = makeCol('c_date', 'Due', 'date');
const checkboxCol = makeCol('c_check', 'Done', 'checkbox');
const peopleCol = makeCol('c_people', 'Assigned', 'people');
const ratingCol = makeCol('c_rating', 'Rating', 'rating');
const progressCol = makeCol('c_progress', 'Progress', 'progress');
const dropdownCol = makeCol('c_dropdown', 'Priority', 'dropdown');
const tagsCol = makeCol('c_tags', 'Tags', 'tags');

const allCols = [textCol, numberCol, statusCol, dateCol, checkboxCol, peopleCol, ratingCol, progressCol, dropdownCol, tagsCol];

describe('evaluateFilterGroup', () => {
  it('returns true for empty rules', () => {
    expect(evaluateFilterGroup(makeGroup('and', []), {}, allCols)).toBe(true);
  });

  it('returns true if column not found (graceful)', () => {
    const rule = makeRule('nonexistent', 'is', 'x');
    expect(evaluateFilterGroup(makeGroup('and', [rule]), {}, allCols)).toBe(true);
  });

  // --- Text operations ---

  describe('text: contains', () => {
    it('matches substring', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'contains', 'ello')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'Hello World' } }, allCols)).toBe(true);
    });

    it('is case-insensitive', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'contains', 'HELLO')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello world' } }, allCols)).toBe(true);
    });

    it('rejects non-match', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'contains', 'xyz')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'Hello' } }, allCols)).toBe(false);
    });
  });

  describe('text: is', () => {
    it('matches exact (case-insensitive)', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'is', 'Hello')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello' } }, allCols)).toBe(true);
    });
  });

  describe('text: starts_with', () => {
    it('matches prefix', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'starts_with', 'hel')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'Hello' } }, allCols)).toBe(true);
    });
  });

  describe('text: ends_with', () => {
    it('matches suffix', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'ends_with', 'llo')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'Hello' } }, allCols)).toBe(true);
    });
  });

  // --- Number operations ---

  describe('number: is', () => {
    it('matches numeric equality', () => {
      const fg = makeGroup('and', [makeRule('c_num', 'is', '42')]);
      expect(evaluateFilterGroup(fg, { c_num: { value: 42 } }, allCols)).toBe(true);
    });
  });

  describe('number: gt', () => {
    it('checks greater than', () => {
      const fg = makeGroup('and', [makeRule('c_num', 'gt', '10')]);
      expect(evaluateFilterGroup(fg, { c_num: { value: 15 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_num: { value: 5 } }, allCols)).toBe(false);
    });
  });

  describe('number: lt', () => {
    it('checks less than', () => {
      const fg = makeGroup('and', [makeRule('c_num', 'lt', '10')]);
      expect(evaluateFilterGroup(fg, { c_num: { value: 5 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_num: { value: 15 } }, allCols)).toBe(false);
    });
  });

  describe('number: between', () => {
    it('checks range inclusive', () => {
      const fg = makeGroup('and', [makeRule('c_num', 'between', [5, 15])]);
      expect(evaluateFilterGroup(fg, { c_num: { value: 10 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_num: { value: 5 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_num: { value: 15 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_num: { value: 20 } }, allCols)).toBe(false);
    });
  });

  // --- Status operations ---

  describe('status: is', () => {
    it('matches exact status key', () => {
      const fg = makeGroup('and', [makeRule('c_status', 'is', 'active')]);
      expect(evaluateFilterGroup(fg, { c_status: { value: 'active' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_status: { value: 'done' } }, allCols)).toBe(false);
    });
  });

  describe('status: is_not', () => {
    it('rejects matching status', () => {
      const fg = makeGroup('and', [makeRule('c_status', 'is_not', 'done')]);
      expect(evaluateFilterGroup(fg, { c_status: { value: 'active' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_status: { value: 'done' } }, allCols)).toBe(false);
    });
  });

  // --- Date operations ---

  describe('date: gt (after)', () => {
    it('checks date after', () => {
      const fg = makeGroup('and', [makeRule('c_date', 'gt', '2024-06-01')]);
      expect(evaluateFilterGroup(fg, { c_date: { value: '2024-06-15' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_date: { value: '2024-05-01' } }, allCols)).toBe(false);
    });
  });

  describe('date: lt (before)', () => {
    it('checks date before', () => {
      const fg = makeGroup('and', [makeRule('c_date', 'lt', '2024-06-01')]);
      expect(evaluateFilterGroup(fg, { c_date: { value: '2024-05-15' } }, allCols)).toBe(true);
    });
  });

  describe('date: between', () => {
    it('checks date range', () => {
      const fg = makeGroup('and', [makeRule('c_date', 'between', ['2024-01-01', '2024-12-31'])]);
      expect(evaluateFilterGroup(fg, { c_date: { value: '2024-06-15' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_date: { value: '2025-01-01' } }, allCols)).toBe(false);
    });
  });

  // --- Checkbox operations ---

  describe('checkbox: checked', () => {
    it('matches true values', () => {
      const fg = makeGroup('and', [makeRule('c_check', 'checked')]);
      expect(evaluateFilterGroup(fg, { c_check: { value: true } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_check: { value: 'true' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_check: { value: 1 } }, allCols)).toBe(true);
    });

    it('rejects false values', () => {
      const fg = makeGroup('and', [makeRule('c_check', 'checked')]);
      expect(evaluateFilterGroup(fg, { c_check: { value: false } }, allCols)).toBe(false);
      expect(evaluateFilterGroup(fg, { c_check: { value: null } }, allCols)).toBe(false);
    });
  });

  describe('checkbox: unchecked', () => {
    it('matches false/null values', () => {
      const fg = makeGroup('and', [makeRule('c_check', 'unchecked')]);
      expect(evaluateFilterGroup(fg, { c_check: { value: false } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_check: { value: null } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_check: { value: 0 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_check: { value: '0' } }, allCols)).toBe(true);
    });
  });

  // --- People operations ---

  describe('people: is', () => {
    it('matches user in comma-separated list', () => {
      const fg = makeGroup('and', [makeRule('c_people', 'is', 'user1')]);
      expect(evaluateFilterGroup(fg, { c_people: { value: 'user1,user2' } }, allCols)).toBe(true);
    });

    it('rejects user not in list', () => {
      const fg = makeGroup('and', [makeRule('c_people', 'is', 'user3')]);
      expect(evaluateFilterGroup(fg, { c_people: { value: 'user1,user2' } }, allCols)).toBe(false);
    });
  });

  describe('people: is_not', () => {
    it('rejects user in list', () => {
      const fg = makeGroup('and', [makeRule('c_people', 'is_not', 'user1')]);
      expect(evaluateFilterGroup(fg, { c_people: { value: 'user1,user2' } }, allCols)).toBe(false);
    });
  });

  // --- Empty checks ---

  describe('is_empty / is_not_empty', () => {
    it('is_empty matches null, undefined, empty string', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'is_empty')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: null } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_text: { value: '' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_text: { value: undefined } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, {}, allCols)).toBe(true);
    });

    it('is_not_empty matches non-empty values', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'is_not_empty')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello' } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_text: { value: '' } }, allCols)).toBe(false);
    });
  });

  // --- Rating ---

  describe('rating: gt / lt', () => {
    it('checks greater than', () => {
      const fg = makeGroup('and', [makeRule('c_rating', 'gt', '3')]);
      expect(evaluateFilterGroup(fg, { c_rating: { value: 4 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_rating: { value: 2 } }, allCols)).toBe(false);
    });
  });

  // --- Combinator logic ---

  describe('AND combinator', () => {
    it('requires all rules to match', () => {
      const fg = makeGroup('and', [
        makeRule('c_text', 'contains', 'hello'),
        makeRule('c_num', 'gt', '5'),
      ]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello world' }, c_num: { value: 10 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello world' }, c_num: { value: 3 } }, allCols)).toBe(false);
    });
  });

  describe('OR combinator', () => {
    it('requires any rule to match', () => {
      const fg = makeGroup('or', [
        makeRule('c_text', 'contains', 'hello'),
        makeRule('c_num', 'gt', '100'),
      ]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello world' }, c_num: { value: 3 } }, allCols)).toBe(true);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'bye' }, c_num: { value: 3 } }, allCols)).toBe(false);
    });
  });

  // --- Tags ---

  describe('tags: contains', () => {
    it('matches tag substring in stringified array', () => {
      const fg = makeGroup('and', [makeRule('c_tags', 'contains', 'bug')]);
      expect(evaluateFilterGroup(fg, { c_tags: { value: 'bug,feature' } }, allCols)).toBe(true);
    });
  });

  // --- Unknown operator fallback ---

  describe('unknown operator', () => {
    it('returns true (default)', () => {
      const fg = makeGroup('and', [makeRule('c_text', 'fake_op' as any, 'x')]);
      expect(evaluateFilterGroup(fg, { c_text: { value: 'hello' } }, allCols)).toBe(true);
    });
  });
});
