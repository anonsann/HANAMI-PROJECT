import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cls } from '../lib/utils';
import { useSettings, applySettingsToDom, applyWideToDom } from '../store/settings';
import { useAuth } from '../store/auth';
import { useMotionAllowed, usePalette } from '../lib/theme';
import { Icon, type IconName } from './icons';
import { AmbientBackground, CircularBadge, Marquee, Shiny } from './visual';
import { CommandPalette } from './CommandPalette';
import { Toaster } from './ui';
import { ClickSpark, Dock, LineSidebar } from '../reactbits';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Odyssey', icon: 'home', end: true },
  { to: '/v', label: 'Visual Novels', icon: 'book' },
  { to: '/c', label: 'Characters', icon: 'person' },
  { to: '/r', label: 'Releases', icon: 'disc' },
  { to: '/p', label: 'Producers', icon: 'building' },
  { to: '/s', label: 'Staff', icon: 'pen' },
  { to: '/g', label: 'Tags', icon: 'tag' },
  { to: '/i', label: 'Traits', icon: 'sparkle' },
  { to: '/quotes', label: 'Quotes', icon: 'quote' },
  { to: '/random', label: 'Roulette', icon: 'dice' },
  { to: '/compare', label: 'Compare', icon: 'scale' },
  { to: '/stats', label: 'Chronicle', icon: 'chart' }
];

const USER_NAV: NavItem[] = [
  { to: '/list', label: 'My Shelf', icon: 'list' },
  { to: '/settings', label: 'Tuning', icon: 'cog' },
  { to: '/about', label: 'About', icon: 'info' }
];

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

function NavEntry({ item, railId }: { item: NavItem; railId: string }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        cls(
          'group relative flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] transition-colors',
          isActive ? 'text-brand' : 'text-ink hover:bg-panel2/70 hover:text-brand'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={`${railId}-active`}
              className="absolute inset-0 -z-10 rounded-sm border border-line bg-panel"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          <Icon name={item.icon} size={15} className={cls('shrink-0', isActive ? 'text-brand' : 'text-faint group-hover:text-brand')} />
          <span className="min-w-0 truncate">{item.label}</span>
          {isActive ? (
            <span aria-hidden="true" className="absolute -left-2.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-sm bg-brand" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/**
 * ReactBits LineSidebar used as a magnetic section index.
 *
 * Upstream renders bare `<li onClick>` rows, so we promote them to focusable
 * `role="link"` elements after mount to keep the menu keyboard-operable.
 */
function IndexRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const palette = usePalette();
  const ref = useRef<HTMLDivElement>(null);
  const items = React.useMemo(() => MAIN_NAV.map((n) => n.label), []);
  const activeIndex = Math.max(
    0,
    MAIN_NAV.findIndex((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
  );

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLLIElement>('li'));
    rows.forEach((row, i) => {
      row.setAttribute('role', 'link');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', items[i] ?? '');
    });
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'LI') return;
      const index = rows.indexOf(target as HTMLLIElement);
      if (index < 0) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(MAIN_NAV[index].to);
      }
    }
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [items, navigate]);

  return (
    <div ref={ref} className="px-2 pb-2">
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">Index</p>
      <LineSidebar
        items={items}
        defaultActive={activeIndex}
        accentColor={palette.brand}
        textColor={palette.mute}
        markerColor={palette.line}
        showIndex={false}
        showMarker
        proximityRadius={56}
        maxShift={10}
        falloff="smooth"
        markerLength={14}
        markerGap={6}
        itemGap={7}
        fontSize={0.72}
        smoothing={90}
        onItemClick={(index) => navigate(MAIN_NAV[index].to)}
      />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[212px] shrink-0 flex-col border-r border-line bg-panel/70 backdrop-blur lg:flex">
      <Link to="/" className="group flex items-center gap-2.5 px-4 pb-3 pt-5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-sm border border-brand/40 bg-panel2 font-jp text-base font-bold text-brand"
        >
          花
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-[0.14em] text-brand2 group-hover:text-brand">
            HANAMI
          </span>
          <Shiny className="text-[9px] tracking-[0.28em] text-faint">花 見 · vndb client</Shiny>
        </span>
      </Link>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-4 py-2 no-scrollbar">
        {MAIN_NAV.map((item) => (
          <NavEntry key={item.to} item={item} railId="main" />
        ))}
        <div className="my-2.5 border-t border-line" />
        {USER_NAV.map((item) => (
          <NavEntry key={item.to} item={item} railId="user" />
        ))}
      </nav>

      <IndexRail />
      <SidebarStatus />
    </aside>
  );
}

function SidebarStatus() {
  const user = useAuth((s) => s.user);
  return (
    <div className="relative border-t border-line px-4 py-3 text-[11px] text-faint">
      <div className="flex items-center gap-2">
        <span className={cls('size-1.5 shrink-0 rounded-full', user ? 'bg-good' : 'bg-line')} aria-hidden="true" />
        {user ? (
          <span className="min-w-0 truncate">
            Reading as <span className="font-semibold text-mute">{user.username}</span>
          </span>
        ) : (
          <span>Guest voyage · list sync off</span>
        )}
      </div>
      <p className="mt-1.5 leading-relaxed">Data © VNDB.org contributors</p>
      <CircularBadge text="HANAMI · VNDB · HANAMI · VNDB · " className="pointer-events-none absolute -top-16 right-1 opacity-40" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Topbar                                                                     */
/* -------------------------------------------------------------------------- */

function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const wide = useSettings((s) => s.wide);
  const setWide = useSettings((s) => s.setWide);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="grid size-7 place-items-center rounded-sm border border-brand/40 bg-panel2 font-jp text-sm font-bold text-brand">
            花
          </span>
          <span className="font-display text-[13px] font-semibold tracking-[0.14em] text-brand2">HANAMI</span>
        </Link>

        <button
          type="button"
          onClick={onOpenPalette}
          className="group ml-auto flex w-44 items-center gap-2 rounded-sm border border-line bg-panel px-2.5 py-1.5 text-[13px] text-faint transition-colors hover:border-brand/60 hover:text-brand sm:ml-0 sm:w-60"
          aria-label="Open quick search (Ctrl K)"
        >
          <Icon name="search" size={14} />
          <span className="flex-1 truncate text-left">Search the archive…</span>
          <kbd className="hidden rounded-sm border border-line bg-panel2 px-1 text-[10px] sm:block">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="btn-quiet p-1.5"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to daybreak theme' : 'Switch to midnight theme'}
            title={theme === 'dark' ? 'Daybreak theme' : 'Midnight theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button
            type="button"
            className={cls('btn-quiet p-1.5', wide && 'text-brand')}
            onClick={() => setWide(!wide)}
            aria-label="Toggle layout width"
            title={wide ? 'Narrow layout' : 'Wide layout'}
          >
            <Icon name="expand" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile dock                                                                */
/* -------------------------------------------------------------------------- */

function MobileDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const items = [MAIN_NAV[0], MAIN_NAV[1], MAIN_NAV[2], MAIN_NAV[9], USER_NAV[0]];

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-line bg-canvas/90 pb-1 pt-1 backdrop-blur lg:hidden"
    >
      <Dock
        items={items.map((item) => {
          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return {
            icon: <Icon name={item.icon} size={19} className={active ? 'text-brand' : 'text-mute'} />,
            label: <span className="text-[11px]">{item.label}</span>,
            onClick: () => navigate(item.to)
          };
        })}
        panelHeight={52}
        baseItemSize={38}
        magnification={52}
        distance={90}
        spring={{ mass: 0.1, stiffness: 150, damping: 12 }}
      />
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-panel/50 pb-20 pt-5 lg:pb-5">
      <Marquee
        text="花見 · HANAMI · THE VISUAL NOVEL DATABASE · "
        className="mb-3 opacity-70"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between">
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

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const motionOk = useMotionAllowed();

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

  const body = (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main id="main-content" className="flex-1 px-3 pb-8 pt-5 sm:px-5 lg:px-7">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <AmbientBackground variant="dots" className="opacity-70" />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-sm bg-brand px-3 py-2 text-[13px] text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      {motionOk ? (
        <ClickSpark sparkColor="rgb(var(--c-brand))" sparkSize={9} sparkRadius={16} sparkCount={7} duration={420} easing="ease-out">
          {body}
        </ClickSpark>
      ) : (
        body
      )}
      <MobileDock />
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
            <p className="font-jp text-2xl text-bad">絶望</p>
            <h1 className="mt-2 font-display text-[17px] text-brand2">The story derailed.</h1>
            <p className="mt-2 break-words text-[13px] text-mute">{this.state.error.message}</p>
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
