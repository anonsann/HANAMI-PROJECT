import { describe, it, expect } from 'vitest';
import { PLATFORMS, MEDIA_TYPES, platformName, mediaTypeName, LANGUAGES, STAFF_ROLES } from './enums';

/**
 * Live values mirrored from GET https://api.vndb.org/kana/schema (verified 2026-08).
 * Guards against enum drift: any platform/media code the API can return must
 * resolve to a human label, and codes that no longer exist must not be offered.
 */
const LIVE_PLATFORMS = [
  'win', 'lin', 'mac', 'web', 'tdo', 'ios', 'and', 'bdp', 'dos', 'dvd', 'drc',
  'nes', 'sfc', 'fm7', 'fm8', 'fmt', 'gba', 'gbc', 'msx', 'nds', 'swi', 'sw2',
  'wii', 'wiu', 'n3d', 'p88', 'p98', 'pce', 'pcf', 'psp', 'ps1', 'ps2', 'ps3',
  'ps4', 'ps5', 'psv', 'smd', 'scd', 'sat', 'vnd', 'x1s', 'x68', 'xb1', 'xb3',
  'xbo', 'xxs', 'mob', 'oth'
];

const LIVE_MEDIA = ['blr', 'mrt', 'cas', 'cd', 'dc', 'dvd', 'flp', 'gdr', 'in', 'mem', 'nod', 'umd', 'otc'];

describe('platform enum vs live schema (SOD-017)', () => {
  it('labels every live platform code', () => {
    const missing = LIVE_PLATFORMS.filter((p) => !(p in PLATFORMS));
    expect(missing).toEqual([]);
  });
  it('maps historically-common codes to their current API codes', () => {
    // The API uses these exact codes; the map must not carry dead ones only.
    expect(platformName('sfc')).toBe('Super Famicom (SNES)');
    expect(platformName('drc')).toBe('Dreamcast');
    expect(platformName('n3d')).toBe('Nintendo 3DS');
    expect(platformName('xxs')).toBe('Xbox Series X/S');
    expect(platformName('ps1')).toBe('PlayStation 1');
  });
  it('does not offer platform codes the API rejected/renamed', () => {
    expect(PLATFORMS['snes']).toBeUndefined();
    expect(PLATFORMS['xsx']).toBeUndefined();
    expect(PLATFORMS['3ds']).toBeUndefined();
    expect(PLATFORMS['dc']).toBeUndefined(); // Dreamcast is `drc`; `dc` is a *media* code
  });
});

describe('media enum vs live schema (SOD-018)', () => {
  it('labels every live media code', () => {
    const missing = LIVE_MEDIA.filter((m) => !(m in MEDIA_TYPES));
    expect(missing).toEqual([]);
  });
  it('maps the memory-card and download codes', () => {
    expect(mediaTypeName('mem')).toBe('Memory card');
    expect(mediaTypeName('dc')).toBe('Download card');
    expect(mediaTypeName('mrt')).toBe('Cartridge');
    expect(mediaTypeName('cas')).toBe('Cassette tape');
  });
});

describe('language enum sanity', () => {
  it('uses the API casing for chinese variants', () => {
    expect(LANGUAGES['zh-Hans']).toBeDefined();
    expect(LANGUAGES['zh-Hant']).toBeDefined();
  });
});

describe('staff roles vs schema (qa exists)', () => {
  it('labels the qa role', () => {
    expect(STAFF_ROLES['qa']).toBe('Quality assurance');
  });
});
