import React, { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { cls } from '../lib/utils';
import { useSettings, applySettingsToDom, applyWideToDom } from '../store/settings';
import { useAuth } from '../store/auth';
import { Icon, type IconName } from './icons';
import { SakuraCanvas } from './visual';
import { CommandPalette } from './CommandPalette';
import { Toaster } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  kana: string;
  end?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Odyssey', icon: 'home', kana: '旅', end: true },
  { to: '/v', label: 'Visual Novels', icon: 'book', kana: '書' },
  { to: '/c', label: 'Characters', icon: 'person', kana: '人' },
  { to: '/r', label: 'Releases', icon: 'disc', kana: '版' },
  { to: '/p', label: 'Producers', icon: 'building', kana: '社' },
  { to: '/s', label: 'Staff', icon: 'pen', kana: '筆' },
  { to: '/g', label: 'Tags', icon: 'tag', kana: '札' },
  { to: '/i', label: 'Traits', icon: 'sparkle', kana: '質' },
  { to: '/quotes', label: 'Quotes', icon: 'quote', kana: '言' },
  { to: '/random', label: 'Roulette', icon: 'dice', kana: '運' },
  { to: '/compare', label: 'Compare', icon: 'scale', kana: '比' },
  { to: '/stats', label: 'Chronicle', icon: 'chart', kana: '記' }
];

const USER_NAV: NavItem[] = [
  { to: '/list', label: 'My Shelf', icon: 'list', kana: '帳' },
  { to: '/settings', label: 'Tuning', icon: 'cog', kana: '調' },
  { to: '/about', label: 'About', icon: 'info', kana: '由' }
];

function NavEntry({ item, compact }: { item: NavItem; compact: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        cls(
          'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-brand/15 text-brand' : 'text-mute hover:bg-panel2/70 hover:text-ink'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative grid size-6 shrink-0 place-items-center">
            <Icon name={item.icon} size={17} />
            {isActive ? (
              <span aria-hidden="true" className="absolute -left-3 h-6 w-0.5 rounded-full bg-brand shadow-glow" />
            ) : null}
          </span>
          {!compact ? <span className="min-w-0 truncate">{item.label}</span> : null}
          {!compact ? (
            <span aria-hidden="true" className={cls('ml-auto font-jp text-xs', isActive ? 'text-gold' : 'text-faint/60')}>
              {item.kana}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 flex-col border-r border-line/70 bg-panel/40 backdrop-blur lg:flex">
      <Link to="/" className="group flex items-center gap-3 px-5 pb-5 pt-6">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl border border-brand/40 bg-panel2 shadow-glow">
          <span className="font-jp text-xl font-bold text-brand">花</span>
        </span>
        <span className="leading-tight">
          <span className="block font-display text-lg tracking-[0.22em] text-ink group-hover:text-brand">HANAMI</span>
          <span className="block font-jp text-[11px] tracking-[0.35em] text-faint">花 見</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 no-scrollbar">
        {MAIN_NAV.map((item) => (
          <NavEntry key={item.to} item={item} compact={false} />
        ))}
        <div className="my-3 border-t border-line/60" />
        {USER_NAV.map((item) => (
          <NavEntry key={item.to} item={item} compact={false} />
        ))}
      </nav>
      <SidebarStatus />
    </aside>
  );
}

function SidebarStatus() {
  const user = useAuth((s) => s.user);
  return (
    <div className="border-t border-line/60 px-5 py-4 text-xs text-faint">
      <div className="flex items-center gap-2">
        <span className={cls('size-1.5 rounded-full', user ? 'bg-good shadow-glow' : 'bg-line')} aria-hidden="true" />
        {user ? (
          <span className="min-w-0 truncate">
            Reading as <span className="font-semibold text-mute">{user.username}</span>
          </span>
        ) : (
          <span>Guest voyage · list sync off</span>
        )}
      </div>
      <p className="mt-2 leading-relaxed">Data © VNDB.org contributors</p>
    </div>
  );
}

function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/75 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-lg border border-brand/40 bg-panel2">
            <span className="font-jp text-base font-bold text-brand">花</span>
          </span>
          <span className="font-display text-base tracking-[0.2em]">HANAMI</span>
        </Link>
        <button
          type="button"
          onClick={onOpenPalette}
          className="group ml-auto flex w-48 items-center gap-2.5 rounded-lg border border-line bg-panel/60 px-3 py-1.5 text-sm text-faint transition-colors hover:border-brand/50 hover:text-mute sm:ml-0 sm:w-64"
          aria-label="Open quick search (Ctrl K)"
        >
          <Icon name="search" size={15} />
          <span className="flex-1 truncate text-left">Search the archive…</span>
          <kbd className="hidden rounded border border-line bg-panel2 px-1.5 text-[10px] sm:block">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn-quiet p-2"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to daybreak theme' : 'Switch to midnight theme'}
            title={theme === 'dark' ? 'Daybreak theme' : 'Midnight theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const items: NavItem[] = [MAIN_NAV[0], MAIN_NAV[1], MAIN_NAV[2], MAIN_NAV[9], USER_NAV[0]];
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-canvas/85 backdrop-blur-md lg:hidden"
    >
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) =>
              cls('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1', isActive ? 'text-brand' : 'text-faint')
            }
          >
            <Icon name={item.icon} size={19} />
            <span className="text-[9px] font-medium">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 px-6 py-8 pb-24 lg:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-jp text-brand">花見</span> Hanami — a community-built window into{' '}
          <a href="https://vndb.org" target="_blank" rel="noopener noreferrer" className="link-fancy">
            VNDB.org
          </a>
          . Fully open source (MIT).
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="https://api.vndb.org/kana" target="_blank" rel="noopener noreferrer" className="link-fancy">
            API docs
          </a>
          <a href="https://vndb.org/d17#4" target="_blank" rel="noopener noreferrer" className="link-fancy">
            Data license
          </a>
          <Link to="/about" className="link-fancy">
            Credits
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const apply = (s: ReturnType<typeof useSettings.getState>) => {
      applySettingsToDom(s);
      applyWideToDom(s.wide);
    };
    apply(useSettings.getState());
    return useSettings.subscribe(apply);
  }, []);

  return (
    <div className="grain relative min-h-screen bg-hero-radial">
      <SakuraCanvas density={0.8} className="opacity-60" />
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-brand px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />
          <main id="main-content" className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  );
}

/* ------------------------------ Error boundary ------------------------------ */

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <div className="card-surface border-bad/40 p-8">
            <p className="font-jp text-3xl text-bad">絶望</p>
            <h1 className="mt-2 font-serif text-xl">The story derailed.</h1>
            <p className="mt-2 break-words text-sm text-mute">{this.state.error.message}</p>
            <button type="button" className="btn-ghost mt-5" onClick={() => location.assign('/')}>
              <Icon name="home" size={15} /> Back to the prologue
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
