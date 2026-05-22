import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Wrappers em volta de fractional-indexing para `pages.sort_order`.
 *
 * Charset BASE_62. Chaves comparaveis via string-compare nativo (NUNCA localeCompare).
 *
 * Convencoes:
 *  - null em a = "antes de tudo"
 *  - null em b = "depois de tudo"
 *  - Para nova page no final de um nivel: nextKeyAfter(last?.sort_order ?? null)
 *  - Para nova page entre A e B: keyBetween(A.sort_order, B.sort_order)
 *  - Para primeira page do mundo: firstKey() === 'a0'
 */

export function firstKey(): string {
  return generateKeyBetween(null, null);
}

export function nextKeyAfter(prev: string | null): string {
  return generateKeyBetween(prev, null);
}

export function previousKeyBefore(next: string | null): string {
  return generateKeyBetween(null, next);
}

export function keyBetween(prev: string | null, next: string | null): string {
  return generateKeyBetween(prev, next);
}

export function nKeysBetween(prev: string | null, next: string | null, n: number): string[] {
  return generateNKeysBetween(prev, next, n);
}

/**
 * Compara duas chaves lexorank (string-compare nativo).
 * Retorna -1, 0, ou 1.
 */
export function compareKeys(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
