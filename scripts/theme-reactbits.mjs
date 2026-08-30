#!/usr/bin/env node
/**
 * Post-processing pass for vendored ReactBits components.
 *
 * Upstream components are authored against a fixed dark palette
 * (`bg-neutral-900`, `text-white`, `border-white/10`, …). Rather than fork the
 * source by hand, we rewrite those tokens onto this app's semantic theme
 * classes (see `tailwind.config.js`) so every component follows the active
 * light/dark VNDB-style theme.
 *
 * The pass is idempotent — re-run it after `scripts/vendor-reactbits.mjs`.
 *
 * Usage:  node scripts/theme-reactbits.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = new URL('../src/reactbits/', import.meta.url).pathname;

/**
 * Ordered token → semantic class mapping. `keepAlpha` propagates Tailwind's
 * `/<opacity>` modifier onto the replacement (e.g. `text-white/70` → `text-ink/70`).
 */
const MAP = [
  // Surfaces
  ['bg-black', 'bg-canvas'],
  ['bg-neutral-950', 'bg-panel'],
  ['bg-neutral-900', 'bg-panel'],
  ['bg-neutral-800', 'bg-panel2'],
  ['bg-neutral-100', 'bg-panel2'],
  ['bg-neutral-200', 'bg-panel2'],
  ['bg-white', 'bg-panel'],

  // Borders / rings / outlines
  ['border-neutral-800', 'border-line'],
  ['border-neutral-700', 'border-line'],
  ['border-white', 'border-line'],
  ['border-black', 'border-line'],
  ['ring-white', 'ring-brand'],
  ['outline-white', 'outline-brand'],
  ['divide-white', 'divide-line'],
  ['divide-neutral-800', 'divide-line'],

  // Text
  ['text-white', 'text-ink'],
  ['text-black', 'text-ink'],
  ['text-neutral-50', 'text-ink'],
  ['text-neutral-100', 'text-ink'],
  ['text-neutral-200', 'text-ink'],
  ['text-neutral-300', 'text-mute'],
  ['text-neutral-400', 'text-mute'],
  ['text-neutral-500', 'text-mute'],
  ['text-neutral-600', 'text-mute'],

  // Upstream hardcodes a near-black surface as an arbitrary Tailwind value in a
  // few components (Dock, Carousel, Stepper, …); route those onto the theme too.
  ['bg-[#120F17]', 'bg-panel'],
  ['bg-[#0c0c0e]', 'bg-panel'],
  ['bg-[#0b0d12]', 'bg-panel'],
  ['bg-[#0b0b12]', 'bg-panel'],
  ['bg-[#0a0713]', 'bg-panel'],
  ['bg-[#160000]', 'bg-panel'],
  ['bg-[#111]', 'bg-panel'],
  ['bg-[#1a1a1a]', 'bg-panel'],
  ['bg-[#222]', 'bg-panel2'],
  ['bg-[#333333]', 'bg-panel2'],
  ['bg-[#555]', 'bg-panel2'],
  ['bg-[#00ffff]', 'bg-brand'],
  ['border-[#222]', 'border-line'],
  ['from-[#120F17]', 'from-panel'],
  ['text-[#e9e9ef]', 'text-ink'],
  ['text-[#2d2d2d]', 'text-ink'],
  ['text-[#120F17]', 'text-ink'],
  ['text-[#111]', 'text-ink'],

  // Placeholders
  ['placeholder-white', 'placeholder-faint'],
  ['placeholder-neutral-400', 'placeholder-faint'],
  ['placeholder-neutral-500', 'placeholder-faint']
];

function theme(source) {
  let out = source;
  for (const [from, to] of MAP) {
    // Match the utility plus an optional Tailwind opacity modifier.
    const re = new RegExp(`(?<![\\w-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/[0-9.]+)?(?![\\w-])`, 'g');
    out = out.replace(re, (m) => m.replace(from, to));
  }
  return out;
}


/**
 * Upstream is written for a looser `tsconfig` than this app uses, so a handful
 * of files trip `noImplicitReturns` / `noUnusedLocals` / React 18 ref typing.
 * Each entry is an exact-string patch against pinned upstream content; if a
 * patch ever fails to apply we fail loudly so the vendored copy can be checked.
 */
const FIXUPS = [
  // --- noImplicitReturns: effects with a conditional cleanup need a final return
  ['Carousel.tsx',
`      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);`,
`      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
    return undefined;
  }, [pauseOnHover]);`],

  ['CountUp.tsx',
`      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);`,
`      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
    return undefined;
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);`],

  ['FallingText.tsx',
`      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);`,
`      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, [trigger]);`],

  ['GradualBlur.tsx',
`      const t = setTimeout(() => onAnimationComplete(), parseFloat(duration) * 1000);
      return () => clearTimeout(t);
    }
  }, [isVisible, animated, onAnimationComplete, duration]);`,
`      const t = setTimeout(() => onAnimationComplete(), parseFloat(duration) * 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isVisible, animated, onAnimationComplete, duration]);`],

  ['LightRays.tsx',
`    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);`,
`    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
    return undefined;
  }, [followMouse]);`],

  ['Stack.tsx',
`      return () => clearInterval(interval);
    }
  }, [autoplay, autoplayDelay, stack, isPaused]);`,
`      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoplay, autoplayDelay, stack, isPaused]);`],

  ['StickerPeel.tsx',
`    if (container) {
      container.addEventListener(eventType, updateLight);
      return () => container.removeEventListener(eventType, updateLight);
    }
  }, [peelDirection]);`,
`    if (container) {
      container.addEventListener(eventType, updateLight);
      return () => container.removeEventListener(eventType, updateLight);
    }
    return undefined;
  }, [peelDirection]);`],

  ['TrueFocus.tsx',
`      return () => clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);`,
`      return () => clearInterval(interval);
    }
    return undefined;
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);`],

  // --- noUnusedParameters / noUnusedLocals
  ['Folder.tsx',
`  const handlePaperMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {`,
`  const handlePaperMouseLeave = (_e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {`],

  ['MorphSlider.tsx', `{items.map((item, i) => (`, `{items.map((_item, i) => (`],

  ['Plasma.tsx',
`const buildFragment = (iterations: number) => {`,
`const buildFragment = (iterations: number) => {
  void iterations;`],

  ['ProfileCard.tsx',
`import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';`,
`import React, { useEffect, useRef, useCallback, useMemo } from 'react';`],

  ['ReflectiveCard.tsx',
`import { Fingerprint, User, Activity, Lock } from 'lucide-react';`,
`import { Fingerprint, Activity, Lock } from 'lucide-react';`],
  ['ReflectiveCard.tsx',
`  const [streamActive, setStreamActive] = useState(false);`,
`  const [, setStreamActive] = useState(false);`],

  ['ScrollStack.tsx',
`    const { scrollTop, containerHeight, scrollContainer } = getScrollData();`,
`    const { scrollTop, containerHeight } = getScrollData();`],

  ['ScrollVelocity.tsx',
`    useAnimationFrame((t, delta) => {`,
`    useAnimationFrame((_t, delta) => {`],

  ['Shuffle.tsx',
`              gsap.set(strips, { y: (i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-y') || '0') });`,
`              gsap.set(strips, { y: (_i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-y') || '0') });`],
  ['Shuffle.tsx',
`              gsap.set(strips, { x: (i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-x') || '0') });`,
`              gsap.set(strips, { x: (_i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-x') || '0') });`],
  ['Shuffle.tsx',
`            vars.y = (i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-y') || '0');`,
`            vars.y = (_i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-y') || '0');`],
  ['Shuffle.tsx',
`            vars.x = (i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-x') || '0');`,
`            vars.x = (_i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-x') || '0');`],

  // --- React 18 ref typing: `RefObject<T | null>` is not a `LegacyRef`
  ['MagicBento.tsx',
`  gridRef?: React.RefObject<HTMLDivElement | null>;`,
`  gridRef?: React.Ref<HTMLDivElement>;`]
];

/** `private` class members that upstream only ever assigns → make them public so
 *  `noUnusedLocals` stops flagging them (ImageTrail declares one per variant). */
const PRIVATE_TO_PUBLIC = [['ImageTrail.tsx', /^(\s*)private DOM: /gm, '$1public DOM: ']];

function applyFixups(source, file) {
  let out = source;
  for (const [target, find, replace] of FIXUPS) {
    if (target !== file) continue;
    // Idempotent: skip when the patched form is already in the file.
    if (out.includes(replace)) continue;
    if (!out.includes(find)) throw new Error(`fixup for ${file} no longer applies: ${find.slice(0, 60)}…`);
    out = out.replace(find, replace);
  }
  for (const [target, re, replace] of PRIVATE_TO_PUBLIC) {
    if (target !== file) continue;
    out = out.replace(re, replace);
  }
  return out;
}

const pascal = (s) => s[0].toUpperCase() + s.slice(1);

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.tsx')).sort();
  const exports = [];
  let changed = 0;

  for (const file of files) {
    const path = join(DIR, file);
    const before = await readFile(path, 'utf8');
    const after = applyFixups(theme(before), file);
    if (after !== before) {
      await writeFile(path, after, 'utf8');
      changed++;
    }
    exports.push(`export { default as ${pascal(file.replace(/\.tsx$/, ''))} } from './${file.replace(/\.tsx$/, '')}';`);
  }

  const barrel = `/* AUTO-GENERATED by scripts/theme-reactbits.mjs — do not edit by hand.
 *
 * Barrel for the vendored ReactBits components in this folder. Each file keeps
 * its upstream default export; re-sync upstream with:
 *
 *   node scripts/vendor-reactbits.mjs <Name> && node scripts/theme-reactbits.mjs
 *
 * Component source: https://github.com/DavidHDev/react-bits (MIT).
 */
${exports.join('\n')}
`;
  await writeFile(join(DIR, 'index.ts'), barrel, 'utf8');

  console.log(`Themed/patched ${changed}/${files.length} component(s); barrel → src/reactbits/index.ts (${exports.length} exports)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
