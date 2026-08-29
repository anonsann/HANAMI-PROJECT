import { create } from 'zustand';
import { vndb } from '../lib/vndb/client';
import { ULIST_ITEM } from '../lib/vndb/fields';
import type { ApiResponse, UlistItem, UlistLabel } from '../lib/vndb/types';

/**
 * Thin store for user-list write operations + a refresh signal.
 * Read hooks live on the MyList page; this tracks write-busy state per VN
 * and lets every surface (detail page, list page) see fresh data.
 */
interface UlistState {
  /** Increments after every successful mutation — lists refetch on change. */
  refreshTick: number;
  busy: Record<string, boolean>;
  lastError: string | null;

  entry: (vnId: string, userId: string) => Promise<UlistItem | null>;
  setLabels: (vnId: string, setIds: number[], unsetIds?: number[]) => Promise<boolean>;
  setVote: (vnId: string, vote: number | null) => Promise<boolean>;
  setNotes: (vnId: string, notes: string | null) => Promise<boolean>;
  setDates: (vnId: string, started: string | null, finished: string | null) => Promise<boolean>;
  remove: (vnId: string) => Promise<boolean>;
  bump: () => void;
  clearError: () => void;
}

async function fetchEntry(vnId: string, userId: string): Promise<UlistItem | null> {
  const res = await vndb.query<UlistItem>(
    'ulist',
    {
      user: userId,
      filters: ['id', '=', vnId],
      fields: 'id,vote,started,finished,notes,labels{id,label}',
      results: 1
    },
    { ttlMs: 0, label: 'ulist entry' }
  );
  return res.results[0] ?? null;
}

export const useUlist = create<UlistState>()((set, get) => {
  async function guard(vnId: string, fn: () => Promise<void>): Promise<boolean> {
    set((s) => ({ busy: { ...s.busy, [vnId]: true }, lastError: null }));
    try {
      await fn();
      get().bump();
      return true;
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      set((s) => {
        const busy = { ...s.busy };
        delete busy[vnId];
        return { busy };
      });
    }
  }

  return {
    refreshTick: 0,
    busy: {},
    lastError: null,

    entry: fetchEntry,

    setLabels: (vnId, setIds, unsetIds = []) =>
      guard(vnId, async () => {
        const body: Record<string, unknown> = {};
        if (setIds.length) body.labels_set = setIds;
        if (unsetIds.length) body.labels_unset = unsetIds;
        if (!Object.keys(body).length) return;
        await vndb.patch(`ulist/${vnId}`, body);
      }),

    setVote: (vnId, vote) =>
      guard(vnId, async () => {
        if (vote !== null && (vote < 10 || vote > 100)) throw new Error('Votes must be between 1.0 and 10.0.');
        await vndb.patch(`ulist/${vnId}`, { vote });
      }),

    setNotes: (vnId, notes) =>
      guard(vnId, async () => {
        await vndb.patch(`ulist/${vnId}`, { notes: notes && notes.trim() ? notes.trim() : null });
      }),

    setDates: (vnId, started, finished) => {
      // VNDB requires finished >= started semantics client-side; validate.
      if (started && finished && started > finished) {
        set({ lastError: 'The finish date cannot be before the start date.' });
        return Promise.resolve(false);
      }
      return guard(vnId, async () => {
        await vndb.patch(`ulist/${vnId}`, { started, finished });
      });
    },

    remove: (vnId) =>
      guard(vnId, async () => {
        await vndb.del(`ulist/${vnId}`);
      }),

    bump: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
    clearError: () => set({ lastError: null })
  };
});

export { ULIST_ITEM };

export type { ApiResponse, UlistItem, UlistLabel };
