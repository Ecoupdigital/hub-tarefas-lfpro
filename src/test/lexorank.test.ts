import { describe, it, expect } from 'vitest';
import {
  firstKey,
  nextKeyAfter,
  previousKeyBefore,
  keyBetween,
  compareKeys,
  nKeysBetween,
} from '@/utils/lexorank';

describe('lexorank utils', () => {
  it('firstKey retorna a0', () => {
    expect(firstKey()).toBe('a0');
  });

  it('nextKeyAfter gera chaves crescentes', () => {
    const k1 = firstKey();
    const k2 = nextKeyAfter(k1);
    const k3 = nextKeyAfter(k2);
    expect(k1 < k2).toBe(true);
    expect(k2 < k3).toBe(true);
  });

  it('previousKeyBefore gera chave menor', () => {
    const k1 = firstKey();
    const before = previousKeyBefore(k1);
    expect(before < k1).toBe(true);
  });

  it('keyBetween gera chave entre dois pontos', () => {
    const k1 = firstKey();
    const k2 = nextKeyAfter(k1);
    const between = keyBetween(k1, k2);
    expect(between > k1).toBe(true);
    expect(between < k2).toBe(true);
  });

  it('compareKeys retorna -1/0/1', () => {
    expect(compareKeys('a0', 'a1')).toBe(-1);
    expect(compareKeys('a1', 'a1')).toBe(0);
    expect(compareKeys('a1', 'a0')).toBe(1);
  });

  it('nKeysBetween retorna N chaves distintas crescentes', () => {
    const keys = nKeysBetween(null, null, 5);
    expect(keys).toHaveLength(5);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });
});
