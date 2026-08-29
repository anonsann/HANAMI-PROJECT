import { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';
import { useUlist } from '../store/ulist';
import { BUILTIN_LABELS } from '../lib/vndb/enums';
import { formatVote } from '../lib/format';
import { toast, Spinner, Modal } from './ui';
import { VoteStars as Stars } from './visual';
import { Icon } from './icons';
import { Link } from 'react-router-dom';
import { cls } from '../lib/utils';
import type { UlistItem } from '../lib/vndb/types';

/**
 * The "add to shelf" control deck on VN pages.
 * Read requires `listread`, writes require `listwrite`.
 */
export function ListPanel({ vnId, vnTitle }: { vnId: string; vnTitle: string }) {
  const user = useAuth((s) => s.user);
  const canWrite = useAuth((s) => s.canWrite());
  const canRead = useAuth((s) => s.can('listread'));
  const busy = useUlist((s) => s.busy[vnId]);
  const store = useUlist();

  const [entry, setEntry] = useState<UlistItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!user || !canRead) return;
    store
      .entry(vnId, user.id)
      .then((e) => {
        if (!cancelled) {
          setEntry(e);
          setNotesDraft(e?.notes ?? '');
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vnId, user?.id, canRead, store.refreshTick]);

  if (!user) {
    return (
      <div className="card-surface px-4 py-3 text-sm text-mute">
        <Icon name="lock" size={14} className="mr-1.5 inline-block text-gold" />
        Connect your VNDB account on the{' '}
        <Link to="/settings" className="link-fancy">
          Tuning page
        </Link>{' '}
        to track this novel on your shelf.
      </div>
    );
  }

  const labelIds = new Set((entry?.labels ?? []).map((l) => l.id));
  const vote = entry?.vote ?? null;

  async function toggleLabel(id: number) {
    const on = labelIds.has(id);
    // The 1..4 labels are mutually exclusive by site convention — unset others.
    const exclusive = [1, 2, 3, 4].includes(id);
    const unset = on ? [id] : exclusive ? [1, 2, 3, 4].filter((x) => x !== id && labelIds.has(x)) : [];
    const ok = await store.setLabels(vnId, on ? [] : [id], unset);
    toast(ok ? 'ok' : 'err', ok ? (on ? 'Removed label.' : `Marked “${BUILTIN_LABELS[id]}”.`) : (store.lastError ?? 'Update failed.'));
  }

  return (
    <div className="card-surface space-y-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="list" size={15} className="text-brand" />
          On your shelf
          {busy ? <Spinner size={13} /> : null}
        </h3>
        {!loaded && canRead ? <span className="text-xs text-faint">checking…</span> : null}
      </div>

      {!canWrite ? (
        <p className="text-xs text-faint">
          This token only has read access — create a token with <strong>listwrite</strong> to manage your shelf here.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleLabel(id)}
                aria-pressed={labelIds.has(id)}
                disabled={busy}
                className={cls(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  labelIds.has(id)
                    ? 'border-brand/70 bg-brand/15 text-brand'
                    : 'border-line bg-panel/60 text-mute hover:text-ink'
                )}
              >
                {BUILTIN_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-faint" htmlFor={`vote-${vnId}`}>
              Your vote
            </label>
            <select
              id={`vote-${vnId}`}
              value={vote ?? ''}
              disabled={busy}
              onChange={async (e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                const ok = await store.setVote(vnId, v);
                toast(ok ? 'ok' : 'err', ok ? (v === null ? 'Vote removed.' : `Voted ${formatVote(v)}.`) : (store.lastError ?? 'Vote failed.'));
              }}
              className="input w-auto py-1 text-xs"
            >
              <option value="" className="bg-panel">No vote</option>
              {Array.from({ length: 91 }, (_, i) => 10 + i).map((v) => (
                <option key={v} value={v} className="bg-panel">
                  {formatVote(v)} {v === 10 ? '/ 10 (worst)' : v === 100 ? '/ 10 (best)' : '/ 10'}
                </option>
              ))}
            </select>
            <Stars vote={vote} />
            <button
              type="button"
              className="btn-quiet px-1.5 text-xs"
              onClick={() => setNotesOpen(true)}
              aria-label="Edit note"
            >
              <Icon name="pen" size={13} /> Note
            </button>
            {entry ? (
              <button
                type="button"
                className="btn-quiet px-1.5 text-xs text-bad"
                disabled={busy}
                onClick={async () => {
                  const ok = await store.remove(vnId);
                  toast(ok ? 'ok' : 'err', ok ? 'Removed from your shelf.' : (store.lastError ?? 'Could not remove.'));
                }}
              >
                <Icon name="trash" size={13} /> Remove
              </button>
            ) : null}
          </div>
        </>
      )}

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title={`Notes — ${vnTitle}`}>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={6}
          className="input resize-y"
          placeholder="Private thoughts about this novel…"
          aria-label="Your note for this title"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={() => setNotesOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              const ok = await store.setNotes(vnId, notesDraft);
              toast(ok ? 'ok' : 'err', ok ? 'Note saved.' : (store.lastError ?? 'Note failed.'));
              if (ok) setNotesOpen(false);
            }}
          >
            Save note
          </button>
        </div>
      </Modal>
    </div>
  );
}
