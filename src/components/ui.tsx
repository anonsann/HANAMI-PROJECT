import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { cls, clamp } from '../lib/utils';
import { Icon } from './icons';

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
      <path
        d="M12 3c4.97 0 9 4.03 9 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------------- Skeleton --------------------------------- */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cls('skeleton', className)} style={style} aria-hidden="true" />;
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
      <div className="grid size-12 place-items-center rounded-full bg-panel2 text-faint">
        <Icon name={icon} size={22} />
      </div>
      <p className="font-serif text-lg text-mute">{title}</p>
      {hint ? <p className="max-w-md text-sm text-faint">{hint}</p> : null}
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
      <div className="grid size-12 place-items-center rounded-full bg-bad/10 text-bad">
        <Icon name="warn" size={22} />
      </div>
      <p className="font-serif text-lg text-ink">{title}</p>
      {message ? <p className="max-w-lg break-words text-sm text-mute">{message}</p> : null}
      {onRetry ? (
        <button type="button" className="btn-ghost mt-1" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
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
    <div className={cls('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: children.props.id ?? id })
        : children}
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 text-sm text-mute transition-colors hover:text-ink disabled:opacity-50"
    >
      <span
        className={cls(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-brand/60 bg-brand/70' : 'border-line bg-panel2'
        )}
      >
        <span
          className={cls(
            'absolute top-0.5 size-3.5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[18px]' : 'left-0.5'
          )}
        />
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
        className="input appearance-none pr-8"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  );
}

/* ---------------------------- Dual range slider ----------------------------- */

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
  const track = 100;
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;

  function commit(nextLo: number, nextHi: number) {
    const a = clamp(nextLo, min, max);
    const b = clamp(nextHi, min, max);
    onChange([
      a <= min && b >= max ? null : a > min ? a : null,
      b >= max && a <= min ? null : b < max ? b : null
    ]);
  }

  return (
    <div className="py-1" aria-label={ariaLabel}>
      <div className="mb-1.5 flex items-center justify-between text-xs text-mute">
        <span>{value[0] === null && value[1] === null ? 'Any' : format(lo)}</span>
        <span className="text-faint">{value[0] === null && value[1] === null ? '' : '→'}</span>
        <span>{value[0] === null && value[1] === null ? '' : format(hi)}</span>
      </div>
      <div className="relative h-5" style={{ width: '100%' }}>
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line/70" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand/70"
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
        />
        <input
          type="range"
          className="zen-range"
          min={min}
          max={max}
          value={lo}
          aria-label="Minimum"
          onChange={(e) => commit(Math.min(Number(e.target.value), hi), hi)}
        />
        <input
          type="range"
          className="zen-range"
          min={min}
          max={max}
          value={hi}
          aria-label="Maximum"
          onChange={(e) => commit(lo, Math.max(Number(e.target.value), lo))}
        />
      </div>
      <span className="sr-only">
        Range {track} percent scale from {min} to {max}
      </span>
    </div>
  );
}

/* ----------------------------------- Tabs ----------------------------------- */

export interface TabDef {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
}

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
    <div role="tablist" className={cls('flex flex-wrap gap-1 border-b border-line', className)}>
      {tabs.map((t, i) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
             
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cls(
              'relative flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm transition-colors',
              selected ? 'text-brand' : 'text-mute hover:text-ink'
            )}
          >
            {t.label}
            {t.badge}
            <span
              className={cls(
                'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity',
                selected ? 'bg-brand opacity-100' : 'opacity-0'
              )}
            />
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cls(
          'card-surface relative w-full border-brand/25 shadow-lift animate-fade-up',
          wide ? 'max-w-5xl' : 'max-w-lg'
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-sm tracking-[0.15em] text-gold">{title ?? 'Dialog'}</h2>
          <button ref={closeRef} type="button" className="btn-quiet -mr-2 p-1" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- Pagination --------------------------------- */

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
      <button type="button" className="btn-ghost px-2.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={16} />
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
              'min-w-9 rounded-lg border px-2.5 py-1.5 text-sm transition-colors',
              it === page ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line bg-panel/60 text-mute hover:text-ink'
            )}
          >
            {it}
          </button>
        )
      )}
      <button
        type="button"
        className="btn-ghost px-2.5"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <Icon name="chevronRight" size={16} />
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
  if (!hasMore) {
    if (shown && shown > 0) {
      return (
        <p className="text-center text-xs text-faint">
          — End of results{total !== undefined ? ` · ${total.toLocaleString()} total` : ''} —
        </p>
      );
    }
    return null;
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button type="button" className="btn-ghost" onClick={onClick} disabled={loading}>
        {loading ? <Spinner size={16} /> : <Icon name="plus" size={16} />} Show more
      </button>
      {shown !== undefined && total !== undefined ? (
        <p className="text-xs text-faint">
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

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cls(
            'card-surface pointer-events-auto flex items-start gap-2.5 px-4 py-3 text-left text-sm shadow-lift animate-fade-up',
            t.kind === 'err' ? 'border-bad/50 text-bad' : t.kind === 'ok' ? 'border-good/40 text-ink' : 'text-ink'
          )}
        >
          <Icon name={t.kind === 'err' ? 'warn' : t.kind === 'ok' ? 'check' : 'info'} size={16} className="mt-0.5 shrink-0" />
          <span className="text-ink">{t.text}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Progress meter ------------------------------ */

export function RatingBar({ rating, votes, className }: { rating: number | null | undefined; votes?: number | null; className?: string }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-faint">Not rated</span>;
  }
  const pct = clamp(((rating / 10) * 100) / 10, 0, 100);
  return (
    <div className={cls('flex items-center gap-2', className)} title={`Bayesian rating ${(rating / 10).toFixed(2)} / 10${votes ? ` · ${votes} votes` : ''}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand2 via-brand to-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs font-semibold text-gold">{(rating / 10).toFixed(2)}</span>
    </div>
  );
}
