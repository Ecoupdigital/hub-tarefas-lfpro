import { describe, it, expect } from 'vitest';
import { getViewStyle, VIEW_STYLE_DEFAULT } from '@/types/database';

describe('getViewStyle', () => {
  it('returns default lfpro when view is null', () => {
    expect(getViewStyle(null)).toBe('lfpro');
    expect(getViewStyle(undefined)).toBe('lfpro');
    expect(VIEW_STYLE_DEFAULT).toBe('lfpro');
  });

  it('returns default lfpro when config is null/undefined', () => {
    expect(getViewStyle({ config: null })).toBe('lfpro');
    expect(getViewStyle({ config: undefined })).toBe('lfpro');
    expect(getViewStyle({} as { config?: Record<string, unknown> })).toBe('lfpro');
  });

  it('returns default lfpro when config.style is missing', () => {
    expect(getViewStyle({ config: {} })).toBe('lfpro');
    expect(getViewStyle({ config: { other: 'value' } })).toBe('lfpro');
  });

  it('returns notion when config.style is notion', () => {
    expect(getViewStyle({ config: { style: 'notion' } })).toBe('notion');
  });

  it('returns lfpro when config.style is lfpro', () => {
    expect(getViewStyle({ config: { style: 'lfpro' } })).toBe('lfpro');
  });

  it('falls back to default on invalid style values', () => {
    expect(getViewStyle({ config: { style: 'invalid' } })).toBe('lfpro');
    expect(getViewStyle({ config: { style: 123 } })).toBe('lfpro');
    expect(getViewStyle({ config: { style: null } })).toBe('lfpro');
  });
});
