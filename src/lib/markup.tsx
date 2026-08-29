/**
 * Renderer for VNDB's description markup (https://vndb.org/d9#4).
 *
 * Supported: [url=...]...[/url], bare http(s) URLs, [spoiler]...[/spoiler]
 * blocks (incl. nesting), [code]/[raw] passthrough, newlines.
 * Everything renders as React text nodes — never dangerouslySetInnerHTML,
 * so markup payloads cannot inject HTML/scripts.
 */

import React from 'react';

export type DescriptionPart =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'spoiler'; text: string }
  | { type: 'newline' };

function isSafeUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Parses VNDB markup into a typed token list. */
export function parseDescription(input: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const pattern = /(\[url=([^\]\s]+?)\]([\s\S]*?)\[\/url\])|(\[spoiler\]([\s\S]*?)\[\/spoiler\])|\[code\]|\[\/code\]|\[raw\]|\[\/raw\]|(https?:\/\/[^\s[\]()<>"']+)|\n/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  function pushText(text: string): void {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && last.type === 'text') last.text += text;
    else parts.push({ type: 'text', text });
  }

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) pushText(input.slice(lastIndex, match.index));
    lastIndex = pattern.lastIndex;

    if (match[1]) {
      const href = match[2];
      const label = match[3] || href;
      if (isSafeUrl(href)) parts.push({ type: 'link', text: label.trim() || href, href });
      else pushText(label);
    } else if (match[4]) {
      parts.push({ type: 'spoiler', text: match[5] });
    } else if (match[6]) {
      const href = match[6];
      if (isSafeUrl(href)) parts.push({ type: 'link', text: href, href });
      else pushText(href);
    } else if (match[0] === '\n') {
      parts.push({ type: 'newline' });
    }
    // [code]/[raw] tags are dropped: their *content* is preserved as text.
  }
  if (lastIndex < input.length) pushText(input.slice(lastIndex));
  return parts;
}

/** Renders the token list with spoiler masking honoring the user's level. */
export function renderDescription(
  input: string | null | undefined,
  maxSpoiler: number,
  keyPrefix = 'd'
): React.ReactNode {
  if (!input || !input.trim()) return null;
  const parts = parseDescription(input);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (part.type) {
      case 'newline':
        return <br key={key} />;
      case 'link':
        return (
          <a key={key} href={part.href} target="_blank" rel="noopener noreferrer" className="link-fancy break-all">
            {part.text}
          </a>
        );
      case 'spoiler':
        if (maxSpoiler >= 2) {
          // Fully visible but subtly framed to indicate it's a spoiler.
          return (
            <span key={key} className="rounded bg-brand/10 px-1 font-serif italic text-brand">
              {part.text}
            </span>
          );
        }
        return <InlineSpoiler key={key} text={part.text} />;
      default:
        return (
          <React.Fragment key={key}>
            {renderTextWithEmphasis(part.text, `${key}-t`)}
          </React.Fragment>
        );
    }
  });
}

/**
 * Minimal emphasis: *bold* and /italic/ spans (cosmetic, safe).
 *
 * SOD-024: implemented as a manual scan instead of a regex with lookbehind —
 * lookbehind is a SyntaxError at parse time on Safari < 16.4 and Firefox < 78,
 * which would take down the entire bundle the moment this module is parsed,
 * well below the es2020 build target.
 */
function renderTextWithEmphasis(text: string, keyPrefix: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let buf = '';
  let k = 0;
  const flush = () => {
    if (buf) {
      out.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{buf}</React.Fragment>);
      buf = '';
    }
  };
  const WORD_LIKE = /[\w/]/;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '*' || ch === '/') {
      const end = text.indexOf(ch, i + 1);
      const hasNewline = end !== -1 && text.includes('\n', i) && text.indexOf('\n', i) < end;
      if (
        end > i + 1 &&
        end - i <= 201 &&
        !hasNewline &&
        (ch === '*' || (i === 0 || !WORD_LIKE.test(text[i - 1])) && (end + 1 >= text.length || !WORD_LIKE.test(text[end + 1])))
      ) {
        flush();
        const inner = text.slice(i + 1, end);
        out.push(
          ch === '*' ? (
            <strong key={`${keyPrefix}-${k++}`}>{inner}</strong>
          ) : (
            <em key={`${keyPrefix}-${k++}`}>{inner}</em>
          )
        );
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

function InlineSpoiler({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      title={open ? 'Hide spoiler' : 'Reveal spoiler'}
      className={
        open
          ? 'rounded bg-brand/15 px-1 font-serif italic text-brand underline decoration-dotted underline-offset-4'
          : 'rounded bg-line/60 px-1 font-serif italic text-transparent select-none transition-colors hover:text-ink/60'
      }
    >
      {open ? text : '▸ spoiler'}
    </button>
  );
}
