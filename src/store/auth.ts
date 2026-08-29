import { create } from 'zustand';
import { vndb } from '../lib/vndb/client';
import type { AuthInfo } from '../lib/vndb/types';

const LS_KEY = 'hanami.v1.auth';
const SS_KEY = 'hanami.v1.auth.session';

interface StoredAuth {
  token: string;
  user: { id: string; username: string };
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: { id: string; username: string } | null;
  permissions: string[];
  /** listread / listwrite */
  busy: boolean;
  error: string | null;

  login: (token: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  can: (perm: 'listread' | 'listwrite') => boolean;
  canWrite: () => boolean;
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(LS_KEY) ?? sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

const initial = loadStored();
if (initial) vndb.setToken(initial.token);

export const useAuth = create<AuthState>()((set, get) => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  permissions: initial?.permissions ?? [],
  busy: false,
  error: null,

  login: async (token: string, remember: boolean) => {
    const clean = token.trim();
    if (!clean) {
      set({ error: 'Please paste your VNDB API token first.' });
      return false;
    }
    // SOD-028: preserve any currently-active session so a failed re-login
    // attempt can't silently deauthenticate the user.
    const previous = get();
    const prevToken = previous.token;
    set({ busy: true, error: null });
    try {
      vndb.setToken(clean);
      const info = await vndb.getAuth<AuthInfo>('authinfo');
      // Drop the previous account's cached reads before swapping identities.
      vndb.clearCache();
      const stored: StoredAuth = { token: clean, user: { id: info.id, username: info.username }, permissions: info.permissions };
      try {
        localStorage.removeItem(LS_KEY);
        sessionStorage.removeItem(SS_KEY);
        (remember ? localStorage : sessionStorage).setItem(remember ? LS_KEY : SS_KEY, JSON.stringify(stored));
      } catch {
        /* storage may be unavailable; session still works in-memory */
      }
      set({ token: clean, user: stored.user, permissions: info.permissions, busy: false, error: null });
      return true;
    } catch (e) {
      if (prevToken) {
        // Restore the previous session exactly as it was.
        vndb.setToken(prevToken);
        set({ busy: false, error: e instanceof Error ? e.message : 'Could not sign in with that token.' });
      } else {
        vndb.setToken(null);
        set({
          busy: false,
          error: e instanceof Error ? e.message : 'Could not sign in with that token.'
        });
      }
      return false;
    }
  },

  logout: () => {
    vndb.setToken(null);
    try {
      localStorage.removeItem(LS_KEY);
      sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
    vndb.clearCache();
    set({ token: null, user: null, permissions: [], error: null });
  },

  can: (perm) => get().permissions.includes(perm),
  canWrite: () => get().permissions.includes('listwrite')
}));
