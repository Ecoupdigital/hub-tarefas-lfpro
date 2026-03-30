import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateFormula, extractColumnRefs, hasCircularRef } from '@/utils/formulaParser';
import { parseDateValue, serializeDateValue } from '@/components/board/DateCell';
import { parseTimeData, formatDuration, parseManualTime, emptyTimeData, formatDurationFull } from '@/components/board/TimeTrackingDetailModal';
import type { Column } from '@/types/board';

// ── Formula Parser ──────────────────────────────────────────────────────────

describe('formulaParser', () => {
  const makeCol = (id: string, title: string, type = 'number'): Column => ({
    id,
    boardId: 'b1',
    title,
    type: type as any,
    width: 100,
    position: 0,
    settings: {},
  });

  const cols: Column[] = [
    makeCol('c1', 'Price'),
    makeCol('c2', 'Quantity'),
    makeCol('c3', 'Name', 'text'),
  ];

  const colVals = (overrides: Record<string, any> = {}) => ({
    c1: { value: 10, ...overrides.c1 },
    c2: { value: 5, ...overrides.c2 },
    c3: { value: 'Hello', ...overrides.c3 },
  });

  describe('evaluateFormula', () => {
    it('returns empty string for empty formula', () => {
      expect(evaluateFormula('', {}, [])).toBe('');
      expect(evaluateFormula('  ', {}, [])).toBe('');
    });

    it('evaluates simple arithmetic', () => {
      expect(evaluateFormula('2 + 3', {}, [])).toBe(5);
      expect(evaluateFormula('10 - 4', {}, [])).toBe(6);
      expect(evaluateFormula('3 * 4', {}, [])).toBe(12);
      expect(evaluateFormula('15 / 3', {}, [])).toBe(5);
    });

    it('respects operator precedence', () => {
      expect(evaluateFormula('2 + 3 * 4', {}, [])).toBe(14);
      expect(evaluateFormula('(2 + 3) * 4', {}, [])).toBe(20);
    });

    it('handles unary minus', () => {
      expect(evaluateFormula('-5', {}, [])).toBe(-5);
      expect(evaluateFormula('-5 + 10', {}, [])).toBe(5);
    });

    it('throws on division by zero', () => {
      expect(evaluateFormula('10 / 0', {}, [])).toBe('#ERR!');
    });

    it('resolves column references', () => {
      expect(evaluateFormula('{Price} * {Quantity}', colVals(), cols)).toBe(50);
    });

    it('returns #NAME? for unknown column', () => {
      expect(evaluateFormula('{Unknown}', colVals(), cols)).toBe('#NAME?');
    });

    it('handles string concatenation with +', () => {
      expect(evaluateFormula('"Hello" + " " + "World"', {}, [])).toBe('Hello World');
    });

    it('evaluates comparison operators', () => {
      expect(evaluateFormula('5 > 3', {}, [])).toBe(true);
      expect(evaluateFormula('5 < 3', {}, [])).toBe(false);
      expect(evaluateFormula('5 >= 5', {}, [])).toBe(true);
      expect(evaluateFormula('5 <= 4', {}, [])).toBe(false);
      expect(evaluateFormula('5 != 3', {}, [])).toBe(true);
    });

    // Functions
    it('SUM adds numbers', () => {
      expect(evaluateFormula('SUM(1, 2, 3)', {}, [])).toBe(6);
    });

    it('AVG calculates average', () => {
      expect(evaluateFormula('AVG(10, 20, 30)', {}, [])).toBe(20);
    });

    it('AVG returns 0 for no args', () => {
      expect(evaluateFormula('AVG()', {}, [])).toBe(0);
    });

    it('COUNT counts non-empty values', () => {
      expect(evaluateFormula('COUNT(1, 2, 3)', {}, [])).toBe(3);
    });

    it('MIN/MAX work', () => {
      expect(evaluateFormula('MIN(5, 2, 8)', {}, [])).toBe(2);
      expect(evaluateFormula('MAX(5, 2, 8)', {}, [])).toBe(8);
    });

    it('IF returns correct branch', () => {
      expect(evaluateFormula('IF(1, "yes", "no")', {}, [])).toBe('yes');
      expect(evaluateFormula('IF(0, "yes", "no")', {}, [])).toBe('no');
    });

    it('IF with only 2 args returns empty for false', () => {
      expect(evaluateFormula('IF(0, "yes")', {}, [])).toBe('');
    });

    it('CONCAT joins strings', () => {
      expect(evaluateFormula('CONCAT("a", "b", "c")', {}, [])).toBe('abc');
    });

    it('ABS returns absolute value', () => {
      expect(evaluateFormula('ABS(-5)', {}, [])).toBe(5);
      expect(evaluateFormula('ABS(5)', {}, [])).toBe(5);
    });

    it('ROUND rounds to decimals', () => {
      expect(evaluateFormula('ROUND(3.14159, 2)', {}, [])).toBe(3.14);
      expect(evaluateFormula('ROUND(3.5)', {}, [])).toBe(4);
    });

    it('DAYS_DIFF calculates days between dates', () => {
      expect(evaluateFormula('DAYS_DIFF("2024-01-01", "2024-01-11")', {}, [])).toBe(10);
    });

    it('DAYS_DIFF errors on invalid dates', () => {
      expect(evaluateFormula('DAYS_DIFF("not-a-date", "2024-01-01")', {}, [])).toBe('#ERR!');
    });

    it('returns #ERR! for unknown function', () => {
      expect(evaluateFormula('UNKNOWN(1)', {}, [])).toBe('#ERR!');
    });

    it('returns #ERR! for unclosed string', () => {
      expect(evaluateFormula('"hello', {}, [])).toBe('#ERR!');
    });

    it('returns #ERR! for unclosed column ref', () => {
      expect(evaluateFormula('{Price', {}, [])).toBe('#ERR!');
    });

    it('handles decimal numbers', () => {
      expect(evaluateFormula('1.5 + 2.3', {}, [])).toBeCloseTo(3.8);
    });

    it('handles nested functions', () => {
      expect(evaluateFormula('ROUND(AVG(1, 2, 3), 1)', {}, [])).toBe(2);
    });
  });

  describe('extractColumnRefs', () => {
    it('extracts column names from formula', () => {
      expect(extractColumnRefs('{Price} * {Quantity}')).toEqual(['Price', 'Quantity']);
    });

    it('returns empty array for no refs', () => {
      expect(extractColumnRefs('1 + 2')).toEqual([]);
    });

    it('handles repeated refs', () => {
      expect(extractColumnRefs('{A} + {A}')).toEqual(['A', 'A']);
    });
  });

  describe('hasCircularRef', () => {
    it('detects direct self-reference', () => {
      expect(hasCircularRef('a', { a: '{A} + 1' })).toBe(true);
    });

    it('detects indirect circular reference', () => {
      expect(hasCircularRef('a', { a: '{B} + 1', b: '{A} + 1' })).toBe(true);
    });

    it('returns false for no circular refs', () => {
      expect(hasCircularRef('a', { a: '{B} + 1', b: '5' })).toBe(false);
    });

    it('returns false when column has no formula', () => {
      expect(hasCircularRef('a', {})).toBe(false);
    });
  });
});

// ── DateCell utilities ──────────────────────────────────────────────────────

describe('parseDateValue', () => {
  it('returns empty for undefined', () => {
    expect(parseDateValue(undefined)).toEqual({ date: '', startTime: '', endTime: '' });
  });

  it('returns empty for empty string', () => {
    expect(parseDateValue('')).toEqual({ date: '', startTime: '', endTime: '' });
  });

  it('parses simple date string', () => {
    expect(parseDateValue('2024-06-15')).toEqual({ date: '2024-06-15', startTime: '', endTime: '' });
  });

  it('parses date with T and time', () => {
    expect(parseDateValue('2024-06-15T14:30')).toEqual({ date: '2024-06-15', startTime: '14:30', endTime: '' });
  });

  it('parses JSON object format', () => {
    const json = JSON.stringify({ date: '2024-06-15', startTime: '09:00', endTime: '17:00' });
    expect(parseDateValue(json)).toEqual({ date: '2024-06-15', startTime: '09:00', endTime: '17:00' });
  });

  it('strips surrounding quotes', () => {
    expect(parseDateValue('"2024-06-15"')).toEqual({ date: '2024-06-15', startTime: '', endTime: '' });
  });

  it('handles JSON with only date', () => {
    const json = JSON.stringify({ date: '2024-01-01' });
    expect(parseDateValue(json)).toEqual({ date: '2024-01-01', startTime: '', endTime: '' });
  });
});

describe('serializeDateValue', () => {
  it('returns empty for empty date', () => {
    expect(serializeDateValue('', '', '')).toBe('');
  });

  it('returns simple string when no times', () => {
    expect(serializeDateValue('2024-06-15', '', '')).toBe('2024-06-15');
  });

  it('returns JSON when startTime exists', () => {
    const result = serializeDateValue('2024-06-15', '09:00', '');
    const parsed = JSON.parse(result);
    expect(parsed.date).toBe('2024-06-15');
    expect(parsed.startTime).toBe('09:00');
    expect(parsed.endTime).toBeUndefined();
  });

  it('returns JSON with both times', () => {
    const result = serializeDateValue('2024-06-15', '09:00', '17:00');
    const parsed = JSON.parse(result);
    expect(parsed.date).toBe('2024-06-15');
    expect(parsed.startTime).toBe('09:00');
    expect(parsed.endTime).toBe('17:00');
  });
});

// ── TimeTracking utilities ──────────────────────────────────────────────────

describe('parseTimeData', () => {
  it('returns empty data for null', () => {
    const result = parseTimeData(null);
    expect(result.sessions).toEqual([]);
    expect(result.totalSeconds).toBe(0);
    expect(result.runningFrom).toBeNull();
  });

  it('treats plain number as totalSeconds', () => {
    const result = parseTimeData(120);
    expect(result.totalSeconds).toBe(120);
    expect(result.sessions).toEqual([]);
  });

  it('parses full object', () => {
    const data = {
      sessions: [{ start: '2024-01-01', end: '2024-01-01', duration: 60, note: 'test' }],
      totalSeconds: 60,
      runningFrom: '2024-01-01T10:00:00',
      estimatedSeconds: 3600,
      runningUserId: 'user1',
    };
    const result = parseTimeData(data);
    expect(result.sessions).toHaveLength(1);
    expect(result.totalSeconds).toBe(60);
    expect(result.runningFrom).toBe('2024-01-01T10:00:00');
    expect(result.estimatedSeconds).toBe(3600);
    expect(result.runningUserId).toBe('user1');
  });

  it('handles object with missing fields', () => {
    const result = parseTimeData({});
    expect(result.sessions).toEqual([]);
    expect(result.totalSeconds).toBe(0);
    expect(result.runningFrom).toBeNull();
    expect(result.estimatedSeconds).toBeUndefined();
  });

  it('handles non-array sessions', () => {
    const result = parseTimeData({ sessions: 'not-array', totalSeconds: 10 });
    expect(result.sessions).toEqual([]);
    expect(result.totalSeconds).toBe(10);
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 05s');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatDuration(3661)).toBe('1h 01m 01s');
  });

  it('formats days', () => {
    expect(formatDuration(90061)).toBe('1d 1h 01m 01s');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('clamps negative to zero', () => {
    expect(formatDuration(-5)).toBe('0s');
  });
});

describe('formatDurationFull', () => {
  it('shows only seconds for small values', () => {
    expect(formatDurationFull(30)).toBe('30s');
  });

  it('shows hours and minutes without seconds when seconds is 0', () => {
    expect(formatDurationFull(3600)).toBe('1h');
  });

  it('shows all parts', () => {
    expect(formatDurationFull(90061)).toBe('1d 1h 1m 1s');
  });
});

describe('parseManualTime', () => {
  it('parses hours and minutes', () => {
    expect(parseManualTime('2h 30m')).toBe(9000);
  });

  it('parses hours only', () => {
    expect(parseManualTime('1h')).toBe(3600);
  });

  it('parses minutes only', () => {
    expect(parseManualTime('45m')).toBe(2700);
  });

  it('parses seconds only', () => {
    expect(parseManualTime('30s')).toBe(30);
  });

  it('parses full h m s', () => {
    expect(parseManualTime('1h 30m 15s')).toBe(5415);
  });

  it('returns null for invalid input', () => {
    expect(parseManualTime('')).toBeNull();
    expect(parseManualTime('abc')).toBeNull();
  });
});

describe('emptyTimeData', () => {
  it('returns fresh empty object', () => {
    const a = emptyTimeData();
    const b = emptyTimeData();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different references
    expect(a.sessions).toEqual([]);
    expect(a.totalSeconds).toBe(0);
    expect(a.runningFrom).toBeNull();
  });
});
