import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vndb } from '../lib/vndb/client';
import { useApi, useGet } from '../lib/vndb/resource';
import { ULIST_ITEM } from '../lib/vndb/fields';
import type { UlistItem, UlistLabel, UserInfo } from '../lib/vndb/types';
import { BUILTIN_LABELS, rlistStatusName } from '../lib/vndb/enums';
import { formatRating, formatVote, formatTimestamp, formatVndbDate } from '../lib/format';
import { squeeze, csvCell } from '../lib/utils';
import { useTitle, useDebouncedValue } from '../hooks';
import { useAuth } from '../store/auth';
import { useUlist } from '../store/ulist';
import { useBookmarks } from '../store/bookmarks';
import { PageHeader } from '../components/PageBits';
import { CoverImage } from '../components/data';
import { VoteStars } from '../components/visual';
import { Pager, Select, Skeleton, ErrorState, EmptyState, Modal, Tabs, Toggle, toast } from '../components/ui';
import { Icon } from '../components/icons';
import { commonToggle } from '../lib/pageUtils';

const PAGE_SIZE = 25;

const LIST_SORTS = [
  { value: 'lastmod|desc', label: 'Recently touched' },
  { value: 'vote|desc', label: 'Vote · high → low' },
  { value: 'vote|asc', label: 'Vote · low → high' },
  { value: 'title|asc', label: 'Title · A → Z' },
  { value: 'rating|desc', label: 'Community rating' },
  { value: 'released|desc', label: 'Release · newest' },
  { value: 'added|desc', label: 'Added · newest first' }
];

export default function MyListPage() {
  useTitle('My Shelf');
  const user = useAuth((s) => s.user);
  const [params, setParams] = useSearchParams();
  const guestUser = params.get('user');

  // Guest mode: look up a public profile by username/id.
  if (!user && guestUser) {
    return <GuestShelf name={guestUser} onExit={() => setParams({}, { replace: true })} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {user ? <Shelf userId={user.id} username={user.username} pathname="mine" /> : <ShelfGate />}

      <BookmarksSection />
    </div>
  );
}

/* ------------------------------- Sign-in gate -------------------------------- */

function ShelfGate() {
  const auth = useAuth();
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(true);
  const [guest, setGuest] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [, setParams] = useSearchParams();

  async function lookupGuest() {
    const name = squeeze(guest);
    if (!name) return;
    setGuestBusy(true);
    setGuestError(null);
    try {
      const res = await vndb.getCached<Record<string, UserInfo | null>>(`user?q=${encodeURIComponent(name)}`, 60_000);
      const hit = res[name];
      if (!hit) {
        setGuestError(`No VNDB user named “${name}”.`);
      } else {
        setParams({ user: hit.id }, { replace: true });
      }
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : 'Lookup failed.');
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PageHeader kana="帳簿" title="My Shelf" />
      <div className="card-surface space-y-4 p-6 lg:col-start-1">
        <h2 className="section-title">Connect your VNDB account</h2>
        <p className="text-sm leading-relaxed text-mute">
          Your VNDB list lives on vndb.org — Hanami reads and writes it through the official API. Create a
          personal token under{' '}
          <a href="https://vndb.org/u/tokens" target="_blank" rel="noopener noreferrer" className="link-fancy">
            My Profile → Applications
          </a>{' '}
          and paste it below. Grant <strong>listread</strong> to browse your shelf and <strong>listwrite</strong> to manage it.
        </p>
        <label className="block text-xs font-semibold uppercase tracking-wider text-faint" htmlFor="token-input">
          API token
        </label>
        <input
          id="token-input"
          type="password"
          autoComplete="off"
          className="input font-mono"
          placeholder="xxxx-xxxxx-xxxxx-xxxx-xxxxx-xxxxx-xxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void auth.login(token, remember);
          }}
        />
        {auth.error ? <p role="alert" className="text-sm text-bad">{auth.error}</p> : null}
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="btn-primary" disabled={auth.busy} onClick={() => void auth.login(token, remember)}>
            {auth.busy ? 'Verifying…' : 'Sign in with token'}
          </button>
          <Toggle checked={remember} onChange={setRemember} label="Remember on this device" />
        </div>
        <p className="text-[11px] leading-relaxed text-faint">
          Tokens are only ever sent to *.vndb.org over HTTPS and stored in your browser's
          localStorage (or sessionStorage when “Remember” is off). Nothing leaves your machine.
        </p>
      </div>

      <div className="card-surface space-y-4 p-6">
        <h2 className="section-title">Peek at a public shelf</h2>
        <p className="text-sm text-mute">No account? Browse any user's public list — votes and labels included.</p>
        <div className="flex gap-2">
          <input className="input" placeholder="VNDB username, e.g. yorhel" value={guest} onChange={(e) => setGuest(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void lookupGuest()} aria-label="VNDB username" />
          <button type="button" className="btn-ghost" onClick={() => void lookupGuest()} disabled={guestBusy}>
            {guestBusy ? '…' : 'Open'}
          </button>
        </div>
        {guestError ? <p role="alert" className="text-sm text-bad">{guestError}</p> : null}
      </div>
    </div>
  );
}

/* --------------------------------- Guest mode -------------------------------- */

function GuestShelf({ name, onExit }: { name: string; onExit: () => void }) {
  useTitle(`Shelf of ${name}`);
  const info = useGet<Record<string, UserInfo | null>>(`user?q=${encodeURIComponent(name)}`, 60_000);
  const hit = info.data ? info.data[name] : undefined;

  if (info.status === 'loading') return <div className="mx-auto max-w-6xl"><Skeleton className="h-64 rounded-xl" /></div>;
  if (!hit) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <EmptyState title={`Could not find user “${name}”.`} />
        <button type="button" className="btn-ghost mx-auto flex" onClick={onExit}>
          <Icon name="arrowLeft" size={14} /> Back
        </button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-quiet px-0 text-sm" onClick={onExit}>
          <Icon name="arrowLeft" size={14} /> Back to my shelf
        </button>
      </div>
      <Shelf userId={hit.id} username={hit.username} pathname="guest" />
    </div>
  );
}

/* ----------------------------------- Shelf ----------------------------------- */

function Shelf({ userId, username, pathname }: { userId: string; username: string; pathname: 'mine' | 'guest' }) {
  const pageSize = PAGE_SIZE;
  const [sort, setSort] = useState('lastmod|desc');
  const [page, setPage] = useState(1);
  const [labelId, setLabelId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 350);
  const [editing, setEditing] = useState<UlistItem | null>(null);
  const canWrite = useAuth((s) => s.canWrite());
  const writeStore = useUlist();
  const busyMap = useUlist((s) => s.busy);

  const labelsRes = useGet<{ labels: UlistLabel[] }>(`ulist_labels?user=${encodeURIComponent(userId)}&fields=count`, 60_000, { auth: pathname === 'mine' });
  const labels = labelsRes.data?.labels ?? [];
  const [sortField, sortDir] = sort.split('|');

  const filter = useMemo(() => {
    const parts: unknown[] = [];
    if (labelId !== null) parts.push(['label', '=', labelId]);
    if (debounced.trim()) parts.push(['search', '=', debounced.trim()]);
    if (parts.length === 0) return [];
    if (parts.length === 1) return parts[0];
    return ['and', ...parts];
  }, [labelId, debounced]);

  const body = useMemo(
    () => ({
      user: userId,
      filters: filter,
      fields: ULIST_ITEM,
      sort: sortField,
      reverse: sortDir === 'desc',
      results: pageSize,
      page,
      count: page === 1
    }),
    [userId, filter, sortField, sortDir, page, pageSize]
  );

  const res = useApi<UlistItem>('ulist', body, { label: 'ulist', ttlMs: 15_000 });
  // SOD-019: refetch in place after writes instead of remounting the whole
  // shelf (which used to close the edit modal mid-save and reset sort/page).
  const refreshTick = useUlist((s) => s.refreshTick);
  useEffect(() => {
    if (refreshTick > 0) res.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / pageSize)) : page + (res.data?.more ? 1 : 0);

  const allCount = labels.reduce((acc, l) => acc + (l.id === 7 ? 0 : (l.count ?? 0)), 0);
  const tabs = [
    { id: 'all', label: 'All', badge: count !== undefined && labelId === null ? <span className="rounded-full bg-panel2 px-1.5 text-[10px] text-faint">{count.toLocaleString()}</span> : null },
    ...labels
      .filter((l) => l.id !== 7)
      .sort((a, b) => a.id - b.id)
      .map((l) => ({
        id: String(l.id),
        label: l.label,
        badge: l.count !== undefined ? <span className="rounded-full bg-panel2 px-1.5 text-[10px] text-faint">{l.count.toLocaleString()}</span> : undefined
      }))
  ];

  async function removeItem(item: UlistItem) {
    const ok = await writeStore.remove(item.id);
    toast(ok ? 'ok' : 'err', ok ? `Removed “${item.vn?.title ?? item.id}”.` : (writeStore.lastError ?? 'Remove failed.'));
  }

  async function exportShelf(format: 'json' | 'csv') {
    try {
      toast('info', 'Gathering your shelf for export…');
      const all: UlistItem[] = [];
      let p = 1;
      for (;;) {
        const r = await vndb.query<UlistItem>(
          'ulist',
          { user: userId, filters: [], fields: ULIST_ITEM, sort: 'id', results: 100, page: p },
          { label: `export p${p}`, ttlMs: 0 }
        );
        all.push(...r.results);
        if (!r.more || p >= 20) break;
        p += 1;
      }
      let blob: Blob;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      } else {
        const header = ['id', 'title', 'vote', 'labels', 'started', 'finished', 'notes', 'added'].join(',');
        const lines = all.map((i) =>
          [
            i.id,
            csvCell(i.vn?.title ?? ''),
            i.vote ?? '',
            csvCell((i.labels ?? []).map((l) => l.label).join('; ')),
            i.started ?? '',
            i.finished ?? '',
            csvCell(i.notes ?? ''),
            i.added ? new Date(i.added * 1000).toISOString().slice(0, 10) : ''
          ].join(',')
        );
        blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vndb-shelf-${username}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast('ok', `Exported ${all.length.toLocaleString()} entries.`);
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Export failed.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Shelf of {username}</h2>
          <p className="text-xs text-faint">
            {allCount > 0 ? `${allCount.toLocaleString()} entries across ${labels.filter((l) => l.id !== 7).length} labels` : 'Live from VNDB'}
            {pathname === 'guest' ? ' · public view' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select ariaLabel="Sort order" value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={LIST_SORTS} />
          <input className="input w-48" placeholder="Filter on shelf…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Filter shelf" />
          {pathname === 'mine' ? (
            <>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => void exportShelf('json')}>
                <Icon name="download" size={13} /> JSON
              </button>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => void exportShelf('csv')}>
                <Icon name="download" size={13} /> CSV
              </button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs tabs={tabs} active={labelId === null ? 'all' : String(labelId)} onChange={(id) => { setLabelId(id === 'all' ? null : Number(id)); setPage(1); }} />

      {res.status === 'loading' && !res.data ? (
        <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (res.data?.results.length ?? 0) === 0 ? (
        <EmptyState title="Nothing on this shelf yet." hint={pathname === 'mine' ? 'Find a novel and label it to begin.' : 'This shelf is empty (or entirely private).'} />
      ) : (
        <ul className="space-y-2">
          {res.data!.results.map((item) => (
            <ShelfRow
              key={item.id}
              item={item}
              editable={pathname === 'mine' && canWrite}
              busy={busyMap[item.id]}
              onEdit={() => setEditing(item)}
              onRemove={() => void removeItem(item)}
            />
          ))}
        </ul>
      )}
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}

      {editing ? (
        <EditModal item={editing} labels={labels} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function ShelfRow({ item, editable, busy, onEdit, onRemove }: { item: UlistItem; editable: boolean; busy?: boolean; onEdit: () => void; onRemove: () => void }) {
  const vn = item.vn;
  return (
    <li className="card-surface flex items-center gap-3 p-2.5">
      {vn ? (
        <CoverImage image={vn.image} alt={vn.title} className="w-12 shrink-0" placeholderLabel={vn.title} />
      ) : (
        <div className="grid w-12 shrink-0 place-items-center rounded-lg bg-panel2 text-faint" style={{ aspectRatio: '3/4' }}>
          <Icon name="book" size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link to={`/v/${item.id}`} className="truncate text-sm font-medium text-ink hover:text-brand">
            {vn?.title ?? item.id}
          </Link>
          {(item.labels ?? []).map((l) => (
            <span key={l.id} className="rounded-full border border-line bg-panel2 px-2 py-px text-[10px] text-mute">
              {l.label}
            </span>
          ))}
          {busy ? <span className="text-[10px] text-gold">saving…</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
          {vn?.rating !== null && vn?.rating !== undefined ? <span>community {formatRating(vn.rating)}</span> : null}
          {item.started ? <span>started {formatVndbDate(item.started)}</span> : null}
          {item.finished ? <span>finished {formatVndbDate(item.finished)}</span> : null}
          {item.added ? <span>added {formatTimestamp(item.added)}</span> : null}
          {(item.releases ?? []).length > 0 ? (
            <span>
              {item.releases!.length} owned release{item.releases!.length > 1 ? 's' : ''}{' '}
              <em className="not-italic text-faint/70">({item.releases!.map((r) => rlistStatusName(r.list_status ?? 0)).join(', ')})</em>
            </span>
          ) : null}
        </div>
        {item.notes ? <p className="mt-1 line-clamp-2 font-serif text-xs italic leading-5 text-mute">“{item.notes}”</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <VoteStars vote={item.vote} />
        <div className="flex items-center gap-1">
          {editable ? (
            <>
              <button type="button" className="btn-quiet px-1.5 py-1 text-xs" onClick={onEdit} aria-label="Edit entry">
                <Icon name="pen" size={13} />
              </button>
              <button type="button" className="btn-quiet px-1.5 py-1 text-xs text-bad" onClick={onRemove} aria-label="Remove entry">
                <Icon name="trash" size={13} />
              </button>
            </>
          ) : (
            <span className="font-mono text-xs text-gold">{formatVote(item.vote)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

/* --------------------------------- Edit modal -------------------------------- */

function EditModal({ item, labels, onClose }: { item: UlistItem; labels: UlistLabel[]; onClose: () => void }) {
  const store = useUlist();
  const [sel, setSel] = useState<number[]>((item.labels ?? []).filter((l) => l.id !== 7).map((l) => l.id));
  const [vote, setVote] = useState<number | ''>(item.vote ?? '');
  const [started, setStarted] = useState(item.started ?? '');
  const [finished, setFinished] = useState(item.finished ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const busy = saving || store.busy[item.id];

  const labelList = labels.filter((l) => l.id !== 7);
  const allLabels = labelList.length > 0 ? labelList : Object.entries(BUILTIN_LABELS).filter(([k]) => Number(k) < 6).map(([id, label]) => ({ id: Number(id), label, private: false }));

  async function save() {
    if (started && finished && started > finished) {
      toast('err', 'Finish date cannot be before the start date.');
      return;
    }
    setSaving(true);
    const before = new Set((item.labels ?? []).map((l) => l.id));
    const after = new Set(sel);
    const setIds = [...after].filter((x) => !before.has(x));
    const unsetIds = [...before].filter((x) => !after.has(x));
    let ok = true;
    if (setIds.length || unsetIds.length) ok = ok && (await store.setLabels(item.id, setIds, unsetIds));
    if ((vote === '' ? null : vote) !== (item.vote ?? null)) ok = ok && (await store.setVote(item.id, vote === '' ? null : vote));
    if ((started || null) !== (item.started ?? null) || (finished || null) !== (item.finished ?? null))
      ok = ok && (await store.setDates(item.id, started || null, finished || null));
    if ((notes.trim() || null) !== (item.notes ?? null)) ok = ok && (await store.setNotes(item.id, notes));
    setSaving(false);
    toast(ok ? 'ok' : 'err', ok ? 'Entry saved.' : (store.lastError ?? 'Save failed.'));
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Edit — ${item.vn?.title ?? item.id}`}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">Labels</p>
          <div className="flex flex-wrap gap-1.5">
            {allLabels.map((l) => {
              const on = sel.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSel((prev) => {
                      const next = commonToggle(prev.map(String), String(l.id)).map(Number);
                      // Playing/Finished/Stalled/Dropped stay mutually exclusive.
                      if ([1, 2, 3, 4].includes(l.id) && next.includes(l.id)) {
                        return next.filter((x) => x === l.id || ![1, 2, 3, 4].includes(x));
                      }
                      return next;
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'border-brand/70 bg-brand/15 text-brand' : 'border-line bg-panel/60 text-mute hover:text-ink'}`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs">
            <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Vote</span>
            <select className="input" value={vote} onChange={(e) => setVote(e.target.value ? Number(e.target.value) : '')}>
              <option value="" className="bg-panel">No vote</option>
              {Array.from({ length: 91 }, (_, i) => 10 + i).map((v) => (
                <option key={v} value={v} className="bg-panel">{formatVote(v)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Started</span>
            <input type="date" className="input" value={started} onChange={(e) => setStarted(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Finished</span>
            <input type="date" className="input" value={finished} onChange={(e) => setFinished(e.target.value)} min={started || undefined} />
          </label>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Notes</span>
          <textarea rows={4} className="input resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private thoughts…" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------- Bookmarks --------------------------------- */

function BookmarksSection() {
  const items = useBookmarks((s) => s.items);
  const remove = useBookmarks((s) => s.remove);

  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title text-sm">Local bookmarks</h2>
        <span className="text-xs text-faint">saved in this browser only</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <div key={b.id} className="card-surface group flex items-center gap-3 p-2.5">
            {b.image ? (
              <img src={b.image} alt={b.title} loading="lazy" className="h-16 w-12 rounded-md object-cover object-top" />
            ) : (
              <div className="grid h-16 w-12 place-items-center rounded-md bg-panel2 text-faint">
                <Icon name="book" size={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link to={`/v/${b.id}`} className="truncate text-sm font-medium text-ink hover:text-brand">{b.title}</Link>
              <p className="text-[11px] text-faint">{b.id} · {b.rating ? formatRating(b.rating) : 'not rated'}</p>
            </div>
            <button type="button" className="btn-quiet px-1.5 text-xs" onClick={() => remove(b.id)} aria-label={`Remove bookmark ${b.title}`}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

