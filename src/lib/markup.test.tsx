import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDescription, renderDescription } from './markup';

describe('parseDescription', () => {
  it('parses [url=] links', () => {
    const parts = parseDescription('See [url=https://example.com]Example[/url] now');
    const link = parts.find((p) => p.type === 'link');
    expect(link).toEqual({ type: 'link', text: 'Example', href: 'https://example.com' });
  });
  it('autolinks bare urls', () => {
    const parts = parseDescription('Read https://vndb.org/d9#4 please');
    expect(parts.some((p) => p.type === 'link' && p.href === 'https://vndb.org/d9#4')).toBe(true);
  });
  it('parses spoiler blocks', () => {
    const parts = parseDescription('He is [spoiler]the killer[/spoiler], wow');
    expect(parts.find((p) => p.type === 'spoiler')).toEqual({ type: 'spoiler', text: 'the killer' });
  });
  it('preserves newlines as tokens', () => {
    expect(parseDescription('a\nb').map((p) => p.type)).toEqual(['text', 'newline', 'text']);
  });
});

describe('renderDescription safety', () => {
  it('never emits raw script/html — user markup is escaped', () => {
    const html = renderToStaticMarkup(<>{renderDescription('<script>alert(1)</script><img src=x>', 0)}</>);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });
  it('rejects javascript: URLs in [url=]', () => {
    const html = renderToStaticMarkup(<>{renderDescription('[url=javascript:alert(1)]click[/url]', 0)}</>);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('click'); // label still readable as plain text
  });
  it('rejects data: URLs in [url=]', () => {
    const html = renderToStaticMarkup(<>{renderDescription('[url=data:text/html,x]go[/url]', 0)}</>);
    expect(html).not.toContain('href=');
  });
  it('renders https links with rel hardening', () => {
    const html = renderToStaticMarkup(<>{renderDescription('[url=https://vndb.org]VNDB[/url]', 0)}</>);
    expect(html).toContain('href="https://vndb.org"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
  it('masks spoilers below tolerance, reveals them at the max level', () => {
    const hidden = renderToStaticMarkup(<>{renderDescription('[spoiler]secret[/spoiler]', 0)}</>);
    expect(hidden).not.toContain('secret');
    expect(hidden).toContain('spoiler');
    const shown = renderToStaticMarkup(<>{renderDescription('[spoiler]secret[/spoiler]', 2)}</>);
    expect(shown).toContain('secret');
  });
});

describe('emphasis rendering without regex lookbehind (SOD-024)', () => {
  it('renders *bold* tokens', () => {
    const html = renderToStaticMarkup(<>{renderDescription('this is *important* stuff', 0)}</>);
    expect(html).toContain('<strong>important</strong>');
  });
  it('renders /italic/ tokens at word boundaries', () => {
    const html = renderToStaticMarkup(<>{renderDescription('a /whisper/ in the dark', 0)}</>);
    expect(html).toContain('<em>whisper</em>');
  });
  it('does not mangle paths or slash abbreviations', () => {
    const html = renderToStaticMarkup(<>{renderDescription('see https://example.com/a/b and w/', 0)}</>);
    expect(html).not.toContain('<em>');
  });
});
