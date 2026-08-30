import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vndb } from '../lib/vndb/client';
import { VN_CARD, CHARACTER_CARD, PRODUCER_CARD, STAFF_CARD } from '../lib/vndb/fields';
import { extractVndbid, squeeze } from '../lib/utils';
import { useDebouncedValue } from '../hooks';
import { Icon } from './icons';
import { GlassPanel } from './ui';
import { Shiny } from './visual';
import type { Character, Producer, Staff, VisualNovel } from '../lib/vndb/types';

interface Result {
  kind: 'vn' | 'character' | 'producer' | 'staff' | 'tag' | 'trait';
  id: string;
  title: string;
  sub?: string;
}

const KIND_META: Record<Result['kind'], { label: string; route: (id: string) => string }> = {
  vn: { label: 'Visual Novel', route: (id) => `/v/${id}` },
  character: { label: 'Character', route: (id) => `/c/${id}` },
  producer: { label: 'Producer', route: (id) => `/p/${id}` },
  staff: { label: 'Staff', route: (id) => `/s/${id}` },
  tag: { label: 'Tag', route: (id) => `/g/${id}` },
  trait: { label: 'Trait', route: (id) => `/i/${id}` }
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query, 280);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setStatus('idle');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = squeeze(debounced);
    const directId = extractVndbid(q);
    if (!q && !directId) {
      setResults([]);
      setStatus('idle');
      return;
    }
    if (directId && /^v/i.test(directId)) {
      setResults([{ kind: 'vn', id: directId, title: `Open ${directId}`, sub: 'Direct identifier' }]);
      setStatus('idle');
      setActive(0);
      return;
    }
    let cancelled = false;
    setStatus('loading');

    async function run() {
      const make = (fields: string) => ({
        filters: ['search', '=', q],
        fields,
        results: 4,
        sort: 'searchrank' as const,
        reverse: true // SOD-021: relevance is meaningful high→low (reverse=true = descending)
      });
      try {
        const [vnRes, charRes, prodRes, staffRes] = await Promise.all([
          vndb.query<VisualNovel>('vn', make(VN_CARD), { label: 'palette vn' }),
          vndb.query<Character>('character', make(CHARACTER_CARD), { label: 'palette character' }),
          vndb.query<Producer>('producer', make(PRODUCER_CARD), { label: 'palette producer' }),
          vndb.query<Staff>('staff', { ...make(`${STAFF_CARD},ismain`), filters: ['and', ['search', '=', q], ['ismain', '=', 1]] }, { label: 'palette staff' })
        ]);
        if (cancelled) return;
        const merged: Result[] = [
          ...vnRes.results.map((v) => ({ kind: 'vn' as const, id: v.id, title: v.title, sub: v.alttitle ?? v.released ?? undefined })),
          ...charRes.results.map((c) => ({ kind: 'character' as const, id: c.id, title: c.name, sub: c.original ?? undefined })),
          ...prodRes.results.map((p) => ({ kind: 'producer' as const, id: p.id, title: p.name, sub: p.original ?? undefined })),
          ...staffRes.results.map((s) => ({ kind: 'staff' as const, id: s.id, title: s.name, sub: s.original ?? undefined }))
        ];
        // Direct-id style inputs (c12, p3, s4) get a guaranteed jump row.
        if (directId) merged.unshift({ kind: mapPrefix(directId), id: directId, title: `Open ${directId}`, sub: 'Direct identifier' });
        setResults(merged);
        setActive(0);
        setStatus('idle');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const go = useCallback(
    (r: Result) => {
      onClose();
      navigate(KIND_META[r.kind].route(r.id));
    },
    [navigate, onClose]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(results.length - 1, a + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[active];
        if (r) go(r);
        else if (query.trim()) {
          onClose();
          navigate(`/v?search=${encodeURIComponent(query.trim())}`);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, active, go, onClose, navigate, query]);

  const grouped = useMemo(() => results, [results]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-canvas/80 px-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Quick search"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel className="w-full max-w-xl overflow-hidden animate-fade-up" width="100%">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Icon name="search" size={18} className="text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search novels, characters, producers, staff… (try v17 or 'fate')"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
            aria-label="Search the VNDB database"
          />
          {status === 'loading' ? <Icon name="refresh" size={16} className="animate-spin-slow text-faint" /> : null}
          <kbd className="rounded-sm border border-line bg-panel2 px-1.5 py-0.5 text-[10px] text-faint">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {grouped.length === 0 && status === 'idle' && query.trim() ? (
            <div className="px-3 py-6 text-center text-sm text-faint">
              No quick matches. Press <kbd className="rounded-sm border border-line bg-panel2 px-1 text-[10px]">Enter</kbd> to open full browse.
            </div>
          ) : (
            grouped.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors ${
                  i === active ? 'bg-brand/15 text-brand' : 'text-ink'
                }`}
              >
                <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-faint">
                  {KIND_META[r.kind].label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.title}</span>
                {r.sub ? <span className="hidden max-w-40 truncate text-xs text-faint sm:block">{r.sub}</span> : null}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-1.5 text-[10px] text-faint">
          <span>↑↓ navigate · ↵ open</span>
          <Shiny className="text-[9px] normal-case tracking-normal text-faint">live from api.vndb.org</Shiny>
        </div>
      </GlassPanel>
    </div>
  );
}

function mapPrefix(id: string): Result['kind'] {
  const p = id[0];
  if (p === 'c') return 'character';
  if (p === 'p') return 'producer';
  if (p === 's') return 'staff';
  if (p === 'g') return 'tag';
  if (p === 'i') return 'trait';
  return 'vn';
}
