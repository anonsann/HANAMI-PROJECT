import React, { useEffect, useRef, useState } from 'react';
import { cls, clamp } from '../lib/utils';
import { useInView, useMediaQuery } from '../hooks';
import { useSettings } from '../store/settings';
import { Icon } from './icons';

/* ------------------------------ Sakura petals ------------------------------- */

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rot: number;
  rotSpeed: number;
  sway: number;
  swaySpeed: number;
  opacity: number;
  hue: number;
}

/** Gentle drifting sakura petals. Honors reduced-motion + visibility. */
export function SakuraCanvas({ density = 1, className }: { density?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const motion = useSettings((s) => s.motion);

  useEffect(() => {
    if (reduce || motion === 'reduce') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let petals: Petal[] = [];
    let running = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(window.innerWidth * dpr);
      canvas!.height = Math.floor(window.innerHeight * dpr);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((window.innerWidth / 70) * density), 8, 42);
      petals = Array.from({ length: count }, () => spawnPetal(true));
    }

    function spawnPetal(anywhere: boolean): Petal {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return {
        x: Math.random() * (w + 80) - 40,
        y: anywhere ? Math.random() * h : -24 - Math.random() * 80,
        size: 5 + Math.random() * 7,
        speedY: 0.55 + Math.random() * 0.9,
        speedX: -0.35 + Math.random() * 0.7,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: -0.012 + Math.random() * 0.024,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.004 + Math.random() * 0.01,
        opacity: 0.35 + Math.random() * 0.5,
        hue: 335 + Math.random() * 18
      };
    }

    function drawPetal(p: Petal) {
      ctx!.save();
      ctx!.translate(p.x + Math.sin(p.sway) * 18, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = p.opacity;
      const s = p.size;
      ctx!.beginPath();
      // Simple two-lobed sakura petal.
      ctx!.moveTo(0, -s);
      ctx!.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.8, s * 0.5, 0, s);
      ctx!.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.95, -s * 0.55, 0, -s);
      const grad = ctx!.createLinearGradient(-s, -s, s, s);
      const light = document.documentElement.dataset.theme === 'light';
      grad.addColorStop(0, `hsla(${p.hue}, 82%, ${light ? 74 : 82}%, 0.95)`);
      grad.addColorStop(1, `hsla(${p.hue + 8}, 70%, ${light ? 62 : 72}%, 0.85)`);
      ctx!.fillStyle = grad;
      ctx!.fill();
      ctx!.restore();
    }

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.x += p.speedX + Math.cos(p.sway) * 0.22;
        p.y += p.speedY;
        p.rot += p.rotSpeed;
        p.sway += p.swaySpeed;
        if (p.y > window.innerHeight + 40 || p.x < -60 || p.x > window.innerWidth + 60) {
          petals[i] = spawnPetal(false);
        } else {
          drawPetal(p);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      running = document.visibilityState === 'visible';
      if (running) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    }

    resize();
    frame();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density, reduce, motion]);

  if (reduce || motion === 'reduce') return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cls('pointer-events-none fixed inset-0 z-[30]', className)}
    />
  );
}

/* -------------------------------- Typewriter -------------------------------- */

export function Typewriter({
  phrases,
  className,
  typeMs = 55,
  holdMs = 2600
}: {
  phrases: string[];
  className?: string;
  typeMs?: number;
  holdMs?: number;
}) {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const motion = useSettings((s) => s.motion);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing');
  const [index, setIndex] = useState(0);
  const reduced = reduce || motion === 'reduce';

  useEffect(() => {
    if (reduced || phrases.length === 0) return;
    const current = phrases[index % phrases.length];
    let timer: number;
    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), typeMs);
      } else {
        setPhase('holding');
      }
    } else if (phase === 'holding') {
      timer = window.setTimeout(() => setPhase('deleting'), holdMs);
    } else {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length - 1)), Math.max(18, typeMs / 2.4));
      } else {
        setIndex((i) => (i + 1) % phrases.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, index, phrases, typeMs, holdMs, reduced]);

  if (phrases.length === 0) return null;
  if (reduced) return <span className={className}>{phrases[0]}</span>;

  return (
    <span className={className}>
      {text}
      <span aria-hidden="true" className="ml-0.5 inline-block w-[2px] animate-caret text-brand">
        ▏
      </span>
    </span>
  );
}

/* -------------------------------- Dialogue box ------------------------------ */

export function DialogueBox({
  name,
  nameIcon,
  children,
  footer,
  className
}: {
  name: React.ReactNode;
  nameIcon?: React.ComponentProps<typeof Icon>['name'];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cls('dialogue-box', className)}>
      <figcaption className="nameplate">
        {nameIcon ? <Icon name={nameIcon} size={13} className="mr-1 inline-block align-[-2px]" /> : null}
        {name}
      </figcaption>
      <div className="mt-1 font-serif text-[15px] leading-7 text-ink">{children}</div>
      <span aria-hidden="true" className="caret-down animate-caret text-xs">
        ▼
      </span>
      {footer ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-faint">{footer}</div> : null}
    </figure>
  );
}

/* ------------------------------- Chapter marker ------------------------------ */

export function ChapterMarker({
  kana,
  title,
  subtitle,
  className
}: {
  kana: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cls('flex items-center gap-4', className)}>
      <div className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-brand/30 bg-panel2/80 shadow-glow">
        <span className="font-jp text-xl font-semibold text-brand">{kana}</span>
      </div>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="truncate text-xs text-faint">{subtitle}</p> : null}
      </div>
      <div aria-hidden="true" className="ml-2 h-px flex-1 bg-gradient-to-r from-line via-brand/30 to-transparent" />
    </div>
  );
}

/* ------------------------------- Rating gauge -------------------------------- */

export function RatingGauge({ rating, size = 120, label }: { rating: number | null | undefined; size?: number; label?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const pct = rating === null || rating === undefined ? 0 : clamp(rating / 100, 0, 1);
  const shown = inView ? pct : 0;
  const angle = shown * 360;
  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5" role="img" aria-label={rating ? `Rating ${(rating / 10).toFixed(2)} out of 10` : 'Not rated'}>
      <div
        className="relative rounded-full transition-[background] duration-700"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(rgb(var(--c-brand)) ${angle}deg, rgb(var(--c-line) / .55) ${angle}deg 360deg)`
        }}
      >
        <div className="absolute inset-[7%] grid place-items-center rounded-full bg-panel text-center">
          <div>
            <div className="font-display text-2xl font-semibold text-gold text-glow-gold">
              {rating === null || rating === undefined ? '—' : (rating / 10).toFixed(2)}
            </div>
            {label ? <div className="text-[10px] uppercase tracking-[0.2em] text-faint">{label}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Reveal ----------------------------------- */

export function Reveal({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cls('reveal', inView && 'revealed', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Tilt card --------------------------------- */

export function TiltCard({
  children,
  className,
  maxTilt = 7
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const motion = useSettings((s) => s.motion);
  const disabled = reduce || motion === 'reduce';

  function onMove(e: React.PointerEvent) {
    if (disabled || e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${(px * maxTilt).toFixed(2)}deg) rotateX(${(-py * maxTilt).toFixed(2)}deg) translateY(-3px)`;
    el.classList.add('lifted');
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.classList.remove('lifted');
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cls('tilt-card', className)}>
      {children}
    </div>
  );
}

/* --------------------------------- Count up ---------------------------------- */

export function CountUp({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString()}
    </span>
  );
}

/* --------------------------------- Star meter -------------------------------- */

export function VoteStars({ vote, size = 13 }: { vote: number | null | undefined; size?: number }) {
  if (vote === null || vote === undefined) return <span className="text-xs text-faint">—</span>;
  const value = vote / 20; // 0..5 stars
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${(vote / 10).toFixed(1)} out of 10`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = clamp(value - i, 0, 1);
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Icon name="star" size={size} className="absolute inset-0 text-line" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Icon name="star" size={size} className="text-gold" fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
