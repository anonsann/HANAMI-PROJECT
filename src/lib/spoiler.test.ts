import { describe, it, expect } from 'vitest';
import { gateSpoilers, gateSpoileredPair, shouldBlurImage } from './spoiler';

describe('gateSpoilers', () => {
  const items = [
    { spoiler: 0, v: 'a' },
    { spoiler: 1, v: 'b' },
    { spoiler: 2, v: 'c' }
  ];
  it('caps strictly', () => {
    expect(gateSpoilers(items, 0).map((i) => i.v)).toEqual(['a']);
    expect(gateSpoilers(items, 1).map((i) => i.v)).toEqual(['a', 'b']);
    expect(gateSpoilers(items, 2).map((i) => i.v)).toEqual(['a', 'b', 'c']);
  });
  it('tolerates out-of-range caps', () => {
    expect(gateSpoilers(items, 99).map((i) => i.v)).toEqual(['a', 'b', 'c']);
    expect(gateSpoilers(items, -3).map((i) => i.v)).toEqual(['a']);
  });
});

describe('gateSpoileredPair', () => {
  it('exposes apparent values by default', () => {
    expect(gateSpoileredPair(['f', 'm'], 0)).toBe('f');
    // Unknown "real" value gracefully falls back to the apparent one.
    expect(gateSpoileredPair(['f', null], 2)).toBe('f');
  });
  it('exposes real values when spoilers are allowed', () => {
    expect(gateSpoileredPair(['f', 'm'], 1)).toBe('m');
  });
  it('handles null pairs', () => {
    expect(gateSpoileredPair(null, 0)).toBeNull();
    expect(gateSpoileredPair(undefined, 1)).toBeNull();
  });
});

describe('shouldBlurImage', () => {
  it('strict mode hides suggestive content early', () => {
    expect(shouldBlurImage({ sexual: 0.5 }, 'strict')).toBe(true);
    expect(shouldBlurImage({ sexual: 0.3 }, 'strict')).toBe(false);
    expect(shouldBlurImage({ violence: 1.9 }, 'strict')).toBe(true);
  });
  it('blur mode only hides clearly adult imagery', () => {
    expect(shouldBlurImage({ sexual: 1.3 }, 'blur')).toBe(true);
    expect(shouldBlurImage({ sexual: 1.0 }, 'blur')).toBe(false);
  });
  it('show mode disables all blurring', () => {
    expect(shouldBlurImage({ sexual: 2, violence: 2 }, 'show')).toBe(false);
  });
  it('missing images are safe', () => {
    expect(shouldBlurImage(null, 'strict')).toBe(false);
    expect(shouldBlurImage(undefined, 'blur')).toBe(false);
  });
});
