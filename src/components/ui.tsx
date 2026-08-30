/**
 * Shared UI primitives — every control the app reuses lives here.
 *
 * This is the second half of the ReactBits bridge (see `visual.tsx`): buttons,
 * cards, modals, tabs, sliders and feedback surfaces are all composed from the
 * vendored ReactBits components so the look and feel stays consistent, while
 * this file keeps the accessibility contract (roles, keyboard nav, focus) that
 * the raw ReactBits demos don't ship with.
 */
import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cls, clamp } from '../lib/utils';
import { useMotionAllowed, usePalette } from '../lib/theme';
import { Icon } from './icons';
import { Glitch, Scramble } from './visual';
import { AnimatedList, GlassSurface, SpotlightCard, StarBorder } from '../reactbits';

/* ---------------------------------- Spinner --------------------------------- */

export function Spinner({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cls('animate-spin text-brand', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
    >
      <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5c0-2.5-2-4.5-4.5-4.5" fill="currentColor" opacity=".25" />
      <path d="M12 3c4.97 0 9 4.03 9 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------- Skeleton --------------------------------- */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cls('skeleton', className)} style={style} aria-hidden="true" />;
}

/* -------------------------- Surfaces (ReactBits cards) ---------------------- */

/** Standard content surface with a cursor spotlight — ReactBits SpotlightCard. */
export function Card({
  children,
  className,
  interactive = true
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const palette = usePalette();
  const motionOk = useMotionAllowed();
  if (!interactive || !motionOk) {
    return <div className={cls('card-surface', className)}>{children}</div>;
  }
  return (
    <SpotlightCard
      className={cls('!rounded-sm !border-line !bg-panel !p-0', className)}
      spotlightColor={
        palette.isDark ? 'rgba(123, 184, 221, 0.14)' : 'rgba(26, 93, 180, 0.10)'
      }
    >
      {children}
    </SpotlightCard>
  );
}

/** Frosted glass surface, used for overlays — ReactBits GlassSurface. */
export function GlassPanel({
  children,
  className,
  width = '100%',
  borderRadius = 3,
  blur = 10
}: {
  children: React.ReactNode;
  className?: string;
  width?: number | string;
  borderRadius?: number;
  blur?: number;
}) {
  const palette = usePalette();
  return (
    <GlassSurface
      width={width}
      borderRadius={borderRadius}
      borderWidth={0.07}
      brightness={palette.isDark ? 60 : 104}
      opacity={palette.isDark ? 0.9 : 0.96}
      blur={blur}
      displace={0.4}
      backgroundOpacity={palette.isDark ? 0.5 : 0.24}
      saturation={1.1}
      distortionScale={-140}
      redOffset={0}
      greenOffset={0}
      blueOffset={0}
      mixBlendMode="normal"
      className={cls('text-ink', className)}
    >
      {children}
    </GlassSurface>
  );
}

/* ------------------------------- Empty / Error ------------------------------ */

export function EmptyState({
  icon = 'sparkle',
  title,
  hint,
  action
}: {
  icon?: React.ComponentProps<typeof Icon>['name'];
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-sm border border-line bg-panel2 text-faint">
        <Icon name={icon} size={20} />
      </div>
      <p className="font-display text-[15px] text-brand2">
        <Scramble text={title} />
      </p>
      {hint ? <p className="max-w-md text-[13px] text-faint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry
}: {
  title?: string;
  error?: Error | string | null;
  onRetry?: () => void;
}) {
  const message = typeof error === 'string' ? error : error?.message;
  return (
    <div role="alert" className="card-surface flex flex-col items-center gap-3 border-bad/40 px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-sm border border-bad/40 bg-bad/10 text-bad">
        <Icon name="warn" size={20} />
      </div>
      <p className="font-display text-[15px] text-bad">
        <Glitch>{title}</Glitch>
      </p>
      {message ? <p className="max-w-lg break-words text-[13px] text-mute">{message}</p> : null}
      {onRetry ? (
        <button type="button" className="btn-ghost mt-1" onClick={onRetry}>
          <Icon name="refresh" size={15} /> Try again
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------ Form primitives ----------------------------- */

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useRef(`f-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className={cls('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-mute">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: children.props.id ?? id })
        : children}
      {hint ? <p className="text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}

/** Spring-loaded switch built on motion/react (the ReactBits motion primitive). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const motionOk = useMotionAllowed();
  const x = useSpring(checked ? 16 : 2, { stiffness: 480, damping: 32, mass: 0.6 });
  useEffect(() => {
    if (motionOk) x.set(checked ? 16 : 2);
  }, [checked, motionOk, x]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 text-[13px] text-mute transition-colors hover:text-ink disabled:opacity-50"
    >
      <span
        className={cls(
          'relative h-[18px] w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-brand/60 bg-brand/70' : 'border-line bg-panel2'
        )}
      >
        {motionOk ? (
          <motion.span
            className="absolute top-[2px] size-3 rounded-full bg-white shadow"
            style={{ x, left: 0 }}
          />
        ) : (
          <span className={cls('absolute top-[2px] size-3 rounded-full bg-white transition-all', checked ? 'left-4' : 'left-[2px]')} />
        )}
      </span>
      <span className="text-left">{label}</span>
    </button>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cls('relative', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-7"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  );
}

/* ---------------------------- Dual range slider ----------------------------- */

/**
 * Elastic dual-thumb range, built on the same motion-value + spring overflow
 * technique as ReactBits' ElasticSlider (which upstream ships without a change
 * callback, so this derives it rather than wrapping it).
 */
function ElasticThumb({
  value,
  min,
  max,
  onChange,
  ariaLabel
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const raw = useMotionValue(value);
  const spring = useSpring(raw, { stiffness: 400, damping: 40, mass: 0.8 });
  const motionOk = useMotionAllowed();

  useEffect(() => {
    if (!dragging) raw.set(value);
  }, [value, dragging, raw]);

  const pct = useTransform(spring, (v) => `${clamp(((v - min) / (max - min)) * 100, 0, 100)}%`);
  const scaleY = useTransform(spring, [min, max], [1, 1]);

  function setFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const next = Math.round(min + ratio * (max - min));
    raw.set(next);
    if (next !== value) onChange(next);
  }

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  });

  return (
    <div
      ref={trackRef}
      className="relative h-5 flex-1 cursor-pointer touch-none select-none"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onChange(clamp(value - step, min, max));
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onChange(clamp(value + step, min, max));
        } else if (e.key === 'Home') {
          e.preventDefault();
          onChange(min);
        } else if (e.key === 'End') {
          e.preventDefault();
          onChange(max);
        }
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line/70" />
      <motion.div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand/70"
        style={{ width: pct, scaleY, transformOrigin: 'left center' }}
      />
      <motion.div
        className="absolute top-1/2 grid size-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-panel bg-brand shadow"
        style={{ left: pct, scale: motionOk && dragging ? 1.15 : 1 }}
      />
    </div>
  );
}

export function DualRangeSlider({
  min,
  max,
  value,
  onChange,
  format = (n: number) => String(n),
  ariaLabel
}: {
  min: number;
  max: number;
  value: [number | null, number | null];
  onChange: (v: [number | null, number | null]) => void;
  format?: (n: number) => string;
  ariaLabel?: string;
}) {
  const lo = value[0] ?? min;
  const hi = value[1] ?? max;
  const isAny = value[0] === null && value[1] === null;

  function commit(nextLo: number, nextHi: number) {
    const a = clamp(Math.min(nextLo, nextHi), min, max);
    const b = clamp(Math.max(nextLo, nextHi), min, max);
    onChange([a <= min ? null : a, b >= max ? null : b]);
  }

  return (
    <div className="py-1" aria-label={ariaLabel}>
      <div className="mb-1 flex items-center justify-between text-[11px] text-mute">
        <span>{isAny ? 'Any' : format(lo)}</span>
        <span className="text-faint">{isAny ? '' : '→'}</span>
        <span>{isAny ? '' : format(hi)}</span>
      </div>
      <div className="flex items-center gap-2">
        <ElasticThumb
          value={lo}
          min={min}
          max={max}
          ariaLabel="Minimum"
          onChange={(v) => commit(v, hi)}
        />
        <ElasticThumb
          value={hi}
          min={min}
          max={max}
          ariaLabel="Maximum"
          onChange={(v) => commit(lo, v)}
        />
      </div>
    </div>
  );
}

/* ----------------------------------- Tabs ----------------------------------- */

export interface TabDef {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
}

/**
 * Tab bar with a springy shared-layout indicator — the same technique ReactBits
 * uses in PillNav/GooeyNav, but with real `role="tablist"` wiring.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  className
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const motionOk = useMotionAllowed();
  const groupId = useRef(`tabs-${Math.random().toString(36).slice(2, 8)}`).current;

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(tabs[next].id);
    }
  }

  return (
    <div role="tablist" className={cls('flex flex-wrap items-end gap-0.5 border-b border-line', className)}>
      {tabs.map((t, i) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            id={`${groupId}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${groupId}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cls(
              'relative flex items-center gap-1.5 rounded-t-sm border border-b-0 border-transparent px-3 py-1.5 text-[13px] transition-colors',
              selected ? 'border-line bg-panel text-brand' : 'text-mute hover:bg-panel2/60 hover:text-ink'
            )}
          >
            {selected && motionOk ? (
              <motion.span
                layoutId={`${groupId}-underline`}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-brand"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : (
              <span className={cls('absolute inset-x-0 -bottom-px h-0.5', selected ? 'bg-brand' : 'bg-transparent')} />
            )}
            {t.label}
            {t.badge}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Modal ----------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel
        width="100%"
        className={cls('relative max-h-[85vh] overflow-hidden', wide ? 'max-w-5xl' : 'max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="font-display text-[13px] font-semibold text-brand2">{title ?? 'Dialog'}</h2>
          <button ref={closeRef} type="button" className="btn-quiet -mr-1 p-1" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
      </GlassPanel>
    </div>
  );
}

/* --------------------------------- Pagination -------------------------------- */

export function Pager({
  page,
  totalPages,
  onChange
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items: (number | '…')[] = [];
  const push = (v: number | '…') => items[items.length - 1] !== v && items.push(v);

  const window = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) push(p);
    else if (items[items.length - 1] !== '…') push('…');
  }

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1">
      <button type="button" className="btn-ghost px-2 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={15} />
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`e-${i}`} className="px-1.5 text-faint">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={it === page ? 'page' : undefined}
            onClick={() => onChange(it)}
            className={cls(
              'min-w-7 rounded-sm border px-2 py-1 text-[13px] transition-colors',
              it === page ? 'border-brand/60 bg-brand/12 text-brand' : 'border-line bg-panel text-mute hover:text-ink'
            )}
          >
            {it}
          </button>
        )
      )}
      <button
        type="button"
        className="btn-ghost px-2 py-1"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <Icon name="chevronRight" size={15} />
      </button>
    </nav>
  );
}

/* --------------------------------- Load more -------------------------------- */

export function LoadMore({
  loading,
  hasMore,
  onClick,
  shown,
  total
}: {
  loading: boolean;
  hasMore: boolean;
  onClick: () => void;
  shown?: number;
  total?: number;
}) {
  const palette = usePalette();
  const motionOk = useMotionAllowed();

  if (!hasMore) {
    if (shown && shown > 0) {
      return (
        <p className="text-center text-[11px] text-faint">
          — End of results{total !== undefined ? ` · ${total.toLocaleString()} total` : ''} —
        </p>
      );
    }
    return null;
  }

  const inner = (
    <button type="button" className="btn-ghost" onClick={onClick} disabled={loading}>
      {loading ? <Spinner size={15} /> : <Icon name="plus" size={15} />} Show more
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      {motionOk ? (
        <StarBorder as="div" color={palette.sky} speed="9s" thickness={1} backgroundColor={palette.panel} className="inline-block">
          {inner}
        </StarBorder>
      ) : (
        inner
      )}
      {shown !== undefined && total !== undefined ? (
        <p className="text-[11px] text-faint">
          Showing {shown.toLocaleString()} of {total.toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Toasts ---------------------------------- */

interface Toast {
  id: number;
  kind: 'ok' | 'err' | 'info';
  text: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: Toast['kind'], text: string) => void;
  dismiss: (id: number) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, text) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, kind, text }].slice(-4) });
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}));

export function toast(kind: Toast['kind'], text: string): void {
  useToasts.getState().push(kind, text);
}

/** Toast stack — ReactBits AnimatedList handles the enter/exit choreography. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] w-80 max-w-[calc(100vw-2rem)]">
      <AnimatedList
        items={toasts.map((t) => t.text)}
        onItemSelect={(_item, index) => dismiss(toasts[index]?.id ?? -1)}
        showGradients={false}
        enableArrowNavigation={false}
        displayScrollbar={false}
        className="[&>*]:pointer-events-auto"
        itemClassName={cls(
          'card-surface mb-2 flex items-start gap-2 px-3 py-2 text-left text-[13px] shadow-card'
        )}
      />
    </div>
  );
}

/* ------------------------------ Progress meter ------------------------------ */

export function RatingBar({ rating, votes, className }: { rating: number | null | undefined; votes?: number | null; className?: string }) {
  if (rating === null || rating === undefined) {
    return <span className="text-[11px] text-faint">Not rated</span>;
  }
  const pct = clamp(((rating / 10) * 100) / 10, 0, 100);
  return (
    <div
      className={cls('flex items-center gap-2', className)}
      title={`Bayesian rating ${(rating / 10).toFixed(2)} / 10${votes ? ` · ${votes} votes` : ''}`}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-line/70">
        <div className="h-full rounded-sm bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] font-semibold text-brand">{(rating / 10).toFixed(2)}</span>
    </div>
  );
}

/* ------------------------------- Small helpers ------------------------------ */

/** Animated presence wrapper used for collapsible sections. */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const motionOk = useMotionAllowed();
  if (!motionOk) return open ? <>{children}</> : null;
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Compact key/value row used across detail pages. */
export function DetailRow({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <tr>
      <th scope="row" className="w-40 whitespace-nowrap py-1 pr-3 align-top text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </th>
      <td className="py-1 align-top text-[13px] text-ink">{children}</td>
    </tr>
  );
}
