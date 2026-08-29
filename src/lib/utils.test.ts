import { describe, it, expect } from 'vitest';
import { cls, clamp, chunk, unique, extractVndbid, cmpVndbid, joinUrl, hoursFromMinutes, squeeze, mulberry32, mapLimit } from './utils';

describe('cls', () => {
  it('joins truthy strings', () => {
    expect(cls('a', false, 'b', undefined, null, 'c')).toBe('a b c');
  });
});

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('collection helpers', () => {
  it('chunks arrays', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('dedupes preserving order', () => {
    expect(unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });
});

describe('vndbid helpers', () => {
  it('extracts ids from mixed input', () => {
    expect(extractVndbid('steins;gate v17 please')).toBe('v17');
    expect(extractVndbid('https://vndb.org/r12')).toBe('r12');
    expect(extractVndbid('nothing here')).toBeNull();
  });
  it('compares ids numerically within a prefix', () => {
    expect(cmpVndbid('v2', 'v10')).toBeLessThan(0);
    expect(cmpVndbid('v10', 'v2')).toBeGreaterThan(0);
  });
});

describe('joinUrl', () => {
  it('normalizes slashes', () => {
    expect(joinUrl('https://x/kana/', '/vn')).toBe('https://x/kana/vn');
    expect(joinUrl('https://x/kana', 'vn')).toBe('https://x/kana/vn');
  });
});

describe('hoursFromMinutes', () => {
  it('formats play times', () => {
    expect(hoursFromMinutes(1230)).toBe('21h');
    expect(hoursFromMinutes(93)).toBe('1.6h');
    expect(hoursFromMinutes(null)).toBe('—');
  });
});

describe('squeeze', () => {
  it('collapses whitespace', () => {
    expect(squeeze('  a   b\n c ')).toBe('a b c');
  });
});

describe('mulberry32', () => {
  it('is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('mapLimit', () => {
  it('limits concurrency and preserves order', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    const results = await mapLimit(items, 3, async (n) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return n * 2;
    });
    expect(results).toEqual(items.map((n) => n * 2));
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
