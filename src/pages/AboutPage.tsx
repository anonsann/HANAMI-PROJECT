import { useTitle } from '../hooks';
import { PageHeader } from '../components/PageBits';
import { ChapterMarker, LoopRibbon, Reveal, ScrollWords } from '../components/visual';
import { Card } from '../components/ui';
import { GlowBox } from '../components/visual';
import { Icon, type IconName } from '../components/icons';
import { Marquee } from '../components/visual';

const FEATURES: { icon: IconName; kana: string; title: string; text: string }[] = [
  {
    icon: 'book',
    kana: '書',
    title: 'The full archive',
    text: 'Every visual novel, character, release, producer, staff credit, tag and trait in VNDB — with deep filtering.'
  },
  {
    icon: 'list',
    kana: '帳',
    title: 'Live list management',
    text: 'Read and write your VNDB list: labels, votes, reading dates, notes — through the official API, with your token never leaving the browser except to vndb.org.'
  },
  {
    icon: 'dice',
    kana: '運',
    title: 'Fate roulette',
    text: 'A documented random-entry algorithm over the whole database, constrained by rating, votes and era.'
  },
  {
    icon: 'quote',
    kana: '言',
    title: 'Voices',
    text: 'Memorable lines across the medium, drawn from the same quote pool the VNDB footer serves.'
  },
  {
    icon: 'scale',
    kana: '比',
    title: 'Column duel',
    text: 'Compare up to four novels across normalized radar axes and a best-in-class table.'
  },
  {
    icon: 'chart',
    kana: '記',
    title: 'The chronicle',
    text: 'Growth arcs of the whole medium: novels and releases per year, rating bands, length and language reach.'
  },
  {
    icon: 'sparkle',
    kana: '質',
    title: 'Safe for work & story',
    text: 'Every image, tag, trait and character respects your spoiler tolerance and NSFW preference — one deliberate click unveils.'
  },
  {
    icon: 'history',
    kana: '軌',
    title: 'Kind to the database',
    text: 'A pacing queue, request deduplication, response caching, and count-only stats queries keep us far under the 200 requests / 5 minutes budget.'
  }
];

export default function AboutPage() {
  useTitle('About');
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader kana="由来" title="About Hanami" />

      <Reveal>
        <div className="relative overflow-hidden rounded-sm border border-line">
          <img
            src="/art/about.jpg"
            alt=""
            aria-hidden="true"
            className="h-40 w-full object-cover opacity-70 sm:h-52"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="font-jp text-[11px] uppercase tracking-[0.45em] text-gold">花見</p>
            <p className="font-display text-xl font-semibold tracking-[0.12em] text-brand2">HANAMI</p>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <Card className="p-5">
          <h2 className="mb-2 font-display text-[15px] font-semibold text-brand2">The premise</h2>
          <ScrollWords className="text-[13px] leading-relaxed text-mute">
            VNDB.org is the definitive community-run database of visual novels — but its interface serves power users
            first. Hanami （花見, “flower viewing”） is an independent, fully open-source client that re-reads the same
            public API as a cozy, visual-novel-inspired journey: petals, prose and all.
          </ScrollWords>
        </Card>
      </Reveal>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={Math.min(i, 5) * 50}>
            <GlowBox className="h-full" color="rgb(var(--c-brand))">
              <div className="h-full bg-panel p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-brand/30 bg-panel2 font-jp text-[13px] text-brand">
                    {f.kana}
                  </span>
                  <h3 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-brand2">
                    <Icon name={f.icon} size={14} className="text-faint" />
                    {f.title}
                  </h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">{f.text}</p>
              </div>
            </GlowBox>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <ChapterMarker kana="源" title="Sources & licenses" />
        <div className="card-surface mt-3 space-y-3 p-4 text-[13px] leading-relaxed text-mute">
          <p>
            <strong className="text-ink">Data</strong> — all database content flows live from{' '}
            <a href="https://api.vndb.org/kana" target="_blank" rel="noopener noreferrer" className="link-fancy">
              api.vndb.org
            </a>{' '}
            and belongs to the VNDB contributors under the{' '}
            <a href="https://vndb.org/d17#4" target="_blank" rel="noopener noreferrer" className="link-fancy">
              VNDB Data License
            </a>
            . VNDB does not endorse this client. Please respect their{' '}
            <a href="https://api.vndb.org/kana" target="_blank" rel="noopener noreferrer" className="link-fancy">
              API usage terms
            </a>
            .
          </p>
          <p>
            <strong className="text-ink">Code</strong> — Hanami itself is MIT-licensed open source. Built with React,
            TypeScript, Vite, Tailwind, Zustand and the{' '}
            <a href="https://reactbits.dev" target="_blank" rel="noopener noreferrer" className="link-fancy">
              ReactBits
            </a>{' '}
            component library. No trackers, no accounts, no servers of its own — it speaks straight from your browser
            to VNDB.
          </p>
          <p>
            <strong className="text-ink">Privacy</strong> — settings, bookmarks and (optionally) your API token live
            in your browser’s storage only. Tokens are transmitted solely to *.vndb.org over HTTPS.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <ChapterMarker kana="旅" title="Begin again" />
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/v" className="btn-primary">
            <Icon name="book" size={15} /> Browse novels
          </a>
          <a href="/stats" className="btn-ghost">
            <Icon name="chart" size={15} /> The chronicle
          </a>
          <a href="/about" className="btn-quiet">
            You are here
          </a>
        </div>
      </Reveal>

      <div className="border-t border-line pt-4">
        <LoopRibbon text="花見 · HANAMI · 花見 · HANAMI · " shape="wave" />
        <Marquee text="花見 · HANAMI · THE VISUAL NOVEL DATABASE · " className="mt-2 opacity-60" />
      </div>
    </div>
  );
}
