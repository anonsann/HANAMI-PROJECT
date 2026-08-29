import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bookmark {
  id: string;
  title: string;
  alttitle?: string | null;
  image?: string | null;
  rating?: number | null;
  addedAt: number;
}

interface BookmarksState {
  items: Bookmark[];
  has: (id: string) => boolean;
  toggle: (b: Omit<Bookmark, 'addedAt'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** Local-only bookmarks — no VNDB account required. */
export const useBookmarks = create<BookmarksState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((b) => b.id === id),
      toggle: (b) => {
        const items = get().items;
        if (items.some((x) => x.id === b.id)) {
          set({ items: items.filter((x) => x.id !== b.id) });
        } else {
          set({ items: [{ ...b, addedAt: Date.now() }, ...items].slice(0, 500) });
        }
      },
      remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
      clear: () => set({ items: [] })
    }),
    { name: 'hanami.v1.bookmarks', version: 1 }
  )
);
