import React, { useEffect, useState } from 'react';
import { useTitle } from '../hooks';
import { useSettings, DEFAULT_API_BASE } from '../store/settings';
import { useAuth } from '../store/auth';
import { vndb } from '../lib/vndb/client';
import { SPOILER_LEVELS } from '../lib/vndb/enums';
import { useInterval } from '../hooks';
import { PageHeader } from '../components/PageBits';
import { Magnetize, Shiny } from '../components/visual';
import { Select, Toggle } from '../components/ui';
import { Icon } from '../components/icons';
import { usePalette } from '../lib/theme';
import { Counter } from '../reactbits';

export default function SettingsPage() {
  useTitle('Tuning');
  const settings = useSettings();
  const auth = useAuth();
  const [baseEdit, setBaseEdit] = useState(settings.apiBase);
  const palette = usePalette();
  const [budget, setBudget] = useState(vndb.requestsInWindow());
  const [cacheN, setCacheN] = useState(vndb.cacheSize());

  useInterval(() => {
    setBudget(vndb.requestsInWindow());
    setCacheN(vndb.cacheSize());
  }, 4000);

  useEffect(() => {
    vndb.setBaseUrl(settings.apiBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader kana="調律" title="Tuning">
        Calibrate the shrine to your senses — appearance, content safety, reading behavior and account wiring.
      </PageHeader>

      <Section title="Appearance" kana="装飾">
        <Row label="Theme" hint="Midnight is the house style; Daybreak for sunlit reading.">
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((id) => (
              <Magnetize key={id} strength={12}>
                <ThemeCard
                  id={id}
                  name={id === 'dark' ? 'Midnight' : 'Daybreak'}
                  current={settings.theme}
                  onSelect={settings.setTheme}
                />
              </Magnetize>
            ))}
          </div>
        </Row>
        <Row label="Motion" hint="Dials down petals, tilts and reveals. Your OS preference is always honored.">
          <Select
            ariaLabel="Motion"
            className="w-52"
            value={settings.motion}
            onChange={(v) => settings.setMotion(v as 'full' | 'reduce')}
            options={[
              { value: 'full', label: 'Full bloom' },
              { value: 'reduce', label: 'Reduced motion' }
            ]}
          />
        </Row>
        <Row label="Density" hint="Compact leans toward list views across browse pages.">
          <Select
            ariaLabel="Density"
            className="w-52"
            value={settings.density}
            onChange={(v) => settings.setDensity(v as 'cozy' | 'compact')}
            options={[
              { value: 'cozy', label: 'Cozy shelves' },
              { value: 'compact', label: 'Compact rows' }
            ]}
          />
        </Row>
        <Row label="Titles" hint="Cards can show original-script titles instead of romanized ones.">
          <Toggle checked={settings.showOriginalTitles} onChange={settings.setShowOriginalTitles} label="Prefer original titles" />
        </Row>
        <Row label="Wide layout" hint="Let content breathe past the default max width.">
          <Toggle checked={settings.wide} onChange={settings.setWide} label="Use full viewport width" />
        </Row>
      </Section>

      <Section title="Content & spoilers" kana="安全">
        <Row label="Spoiler tolerance" hint="Tags, traits, characters and descriptions beyond this level stay hidden until you reveal them.">
          <Select
            ariaLabel="Spoiler tolerance"
            className="w-52"
            value={String(settings.spoilerMax)}
            onChange={(v) => settings.setSpoilerMax(Number(v) as 0 | 1 | 2)}
            options={SPOILER_LEVELS.map((label, i) => ({ value: String(i), label }))}
          />
        </Row>
        <Row
          label="Adult imagery"
          hint="How to treat images the community flagged: strict hides more, 'show' turns blurring off entirely. Hidden images are always one deliberate click away."
        >
          <Select
            ariaLabel="Adult imagery"
            className="w-52"
            value={settings.nsfw}
            onChange={(v) => settings.setNsfw(v as 'strict' | 'blur' | 'show')}
            options={[
              { value: 'strict', label: 'Strict — hide suggestive art' },
              { value: 'blur', label: 'Blur flagged art (default)' },
              { value: 'show', label: 'Show everything (18+)' }
            ]}
          />
        </Row>
        <Row label="Results per page" hint="Browsing lists across the app.">
          <Select
            ariaLabel="Results per page"
            className="w-52"
            value={String(settings.pageSize)}
            onChange={(v) => settings.setPageSize(Number(v))}
            options={[12, 24, 48, 96].map((n) => ({ value: String(n), label: `${n} per page` }))}
          />
        </Row>
      </Section>

      <Section title="VNDB account" kana="鑑">
        {auth.user ? (
          <div className="card-surface space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm">
                  Signed in as <strong className="text-gold">{auth.user.username}</strong>{' '}
                  <span className="text-xs text-faint">({auth.user.id})</span>
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  Permissions: {auth.permissions.length > 0 ? auth.permissions.join(', ') : 'none granted'}
                </p>
              </div>
              <button type="button" className="btn-ghost" onClick={auth.logout}>
                <Icon name="x" size={14} /> Disconnect
              </button>
            </div>
            {!auth.canWrite() ? (
              <p className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                This token lacks <strong>listwrite</strong> — list edits will be read-only. Create a token
                with listwrite at vndb.org/u/tokens to manage your shelf from here.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-mute">
            Not connected. Sign in from{' '}
            <a href="/list" className="link-fancy">
              My Shelf
            </a>
            {' '}with a personal token to sync your list.
          </p>
        )}
      </Section>

      <Section title="Connection & cache" kana="接続">
        <Row label="API endpoint" hint="Default is api.vndb.org. Beta/via proxies only when you know why.">
          <div className="flex flex-wrap items-center gap-2">
            <input className="input w-72 font-mono text-xs" value={baseEdit} onChange={(e) => setBaseEdit(e.target.value)} aria-label="API base URL" />
            <button
              type="button"
              className="btn-ghost py-1.5 text-xs"
              onClick={() => {
                const url = baseEdit.trim() || DEFAULT_API_BASE;
                settings.setApiBase(url);
                vndb.setBaseUrl(url);
                setBaseEdit(url);
              }}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-quiet py-1.5 text-xs"
              onClick={() => {
                settings.setApiBase(DEFAULT_API_BASE);
                vndb.setBaseUrl(DEFAULT_API_BASE);
                setBaseEdit(DEFAULT_API_BASE);
              }}
            >
              Reset
            </button>
          </div>
        </Row>
        <Row label="Rate budget" hint="Requests started in the rolling 5-minute window (server allows 200).">
          <div className="flex items-center gap-3">
            <div className="h-2 w-44 overflow-hidden rounded-sm bg-line/60">
              <div
                className={`h-full rounded-sm transition-[width] ${budget > 160 ? 'bg-bad' : budget > 110 ? 'bg-warn' : 'bg-good'}`}
                style={{ width: `${Math.min(100, (budget / 200) * 100)}%` }}
              />
            </div>
            <span className="inline-flex items-baseline gap-1 text-[13px] text-mute">
              <Counter value={budget} fontSize={14} padding={0} gap={0} horizontalPadding={2} textColor={palette.brand} />
              <span className="text-faint">/ 200</span>
            </span>
          </div>
        </Row>
        <Row label="Local cache" hint="Responses cached in this browser to keep the archive snappy.">
          <div className="flex items-center gap-3 text-sm text-mute">
            <span className="inline-flex items-baseline gap-1 text-[13px]">
              <Counter value={cacheN} fontSize={14} padding={0} gap={0} horizontalPadding={2} textColor={palette.brand} />
              <span className="text-faint">entries</span>
            </span>
            <button
              type="button"
              className="btn-ghost py-1.5 text-xs"
              onClick={() => {
                vndb.clearCache();
                setCacheN(0);
              }}
            >
              <Icon name="trash" size={13} /> Clear cache
            </button>
          </div>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, kana, children }: { title: string; kana: string; children: React.ReactNode }) {
  return (
    <section className="vndb-box">
      <div className="vndb-box-title">
        <span className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-sm border border-brand/30 bg-panel font-jp text-[11px] text-brand">
            {kana}
          </span>
          {title}
        </span>
        <Shiny className="text-[10px] normal-case tracking-normal text-faint">tuning</Shiny>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-faint">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Theme swatch. The preview mirrors the two VNDB-derived palettes in
 * `styles/index.css` (default skin / Angelic Serenade).
 */
function ThemeCard({ id, name, current, onSelect }: { id: 'dark' | 'light'; name: string; current: string; onSelect: (t: 'dark' | 'light') => void }) {
  const active = current === id;
  const dark = id === 'dark';
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(id)}
      className={`group w-36 overflow-hidden rounded-sm border text-left transition-all ${active ? 'border-brand' : 'border-line hover:border-faint'}`}
    >
      <span className={`relative block h-16 ${dark ? 'bg-[#08121e]' : 'bg-[#f5f7fa]'}`}>
        <span className={`absolute left-3 top-3 block h-6 w-10 rounded-sm ${dark ? 'bg-[#071c30]' : 'bg-white'}`} />
        <span className={`absolute bottom-2 left-3 block h-1.5 w-16 rounded-sm ${dark ? 'bg-[#7bb8dd]/70' : 'bg-[#1a5db4]'}`} />
        <span className={`absolute bottom-2 right-3 block h-1.5 w-6 rounded-sm ${dark ? 'bg-[#e4aa44]/80' : 'bg-[#b5761a]'}`} />
      </span>
      <span className={`block px-3 py-2 text-[12px] ${active ? 'bg-brand/10 text-brand' : 'bg-panel text-ink'}`}>
        {name}
      </span>
    </button>
  );
}
