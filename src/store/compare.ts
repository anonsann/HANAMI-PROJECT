import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareState {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** Comparison tray — persists across sessions, max 4 entries. */
export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids;
        if (ids.includes(id)) set({ ids: ids.filter((x) => x !== id) });
        else set({ ids: [...ids, id].slice(-4) });
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
      clear: () => set({ ids: [] })
    }),
    { name: 'hanami.v1.compare', version: 1 }
  )
);
