import { useTitle } from '../hooks';
import { PageHeader } from '../components/PageBits';
import { ChapterMarker, Reveal, DialogueBox } from '../components/visual';
import { Icon, type IconName } from '../components/icons';

const FEATURES: { icon: IconName; kana: string; title: string; text: string }[] = [
  { icon: 'book', kana: '書', title: 'The full archive', text: 'Every visual novel, character, release, producer, staff credit, tag and trait in VNDB — with deep filtering.' },
  { icon: 'list', kana: '帳', title: 'Live list management', text: 'Read and write your VNDB list: labels, votes, reading dates, notes — through the official API, with your token never leaving the browser except to vndb.org.' },
  { icon: 'dice', kana: '運', title: 'Fate roulette', text: 'A documented random-entry algorithm over the whole database, constrained by rating, votes and era.' },
  { icon: 'quote', kana: '言', title: 'Voices', text: 'Memorable lines across the medium, drawn from the same quote pool the VNDB footer serves.' },
  { icon: 'scale', kana: '比', title: 'Column duel', text: 'Compare up to four novels across normalized radar axes and a best-in-class table.' },
  { icon: 'chart', kana: '記', title: 'The chronicle', text: 'Growth arcs of the whole medium: novels and releases per year, rating bands, length and language reach.' },
  { icon: 'sparkle', kana: '質', title: 'Safe for work & story', text: 'Every image, tag, trait and character respects your spoiler tolerance and NSFW preference — one deliberate click unveils.' },
  { icon: 'history', kana: '軌', title: 'Kind to the database', text: 'A pacing queue, request deduplication, response caching, and count-only stats queries keep us far under the 200 requests / 5 minutes budget.' }
];

export default function AboutPage() {
  useTitle('About');
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader kana="由来" title="About Hanami" />

      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-brand/25">
          <img src="/art/about.jpg" alt="" aria-hidden="true" className="h-44 w-full object-cover opacity-60 sm:h-56" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="font-jp text-sm tracking-[0.5em] text-gold">花見</p>
            <p className="font-display text-2xl tracking-[0.15em] text-ink text-glow">HANAMI</p>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <DialogueBox name="The premise" nameIcon="sparkle">
          <p>
            VNDB.org is the definitive community-run database of visual novels — but its interface serves power
            users first. Hanami （花見， “flower viewing”） is an independent, fully open-source client that re-reads the
            same public API as a cozy, visual-novel-inspired journey: petals, prose and all.
          </p>
        </DialogueBox>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Reveal key={f.title} className="card-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-brand/30 bg-panel2 font-jp text-base text-brand">{f.kana}</span>
              <h3 className="font-serif font-semibold">{f.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mute">{f.text}</p>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <ChapterMarker kana="源" title="Sources & licenses" />
        <div className="card-surface mt-4 space-y-3 p-5 text-sm leading-relaxed text-mute">
          <p>
            <strong className="text-ink">Data</strong> — all database content flows live from{' '}
            <a href="https://api.vndb.org/kana" target="_blank" rel="noopener noreferrer" className="link-fancy">api.vndb.org</a>{' '}
            and belongs to the VNDB contributors under the{' '}
            <a href="https://vndb.org/d17#4" target="_blank" rel="noopener noreferrer" className="link-fancy">VNDB Data License</a>.
            VNDB does not endorse this client. Please respect their{' '}
            <a href="https://api.vndb.org/kana" target="_blank" rel="noopener noreferrer" className="link-fancy">API usage terms</a>.
          </p>
          <p>
            <strong className="text-ink">Code</strong> — Hanami itself is MIT-licensed open source. Built with React,
            TypeScript, Vite, Tailwind and Zustand. No trackers, no accounts, no servers of its own — it speaks
            straight from your browser to VNDB.
          </p>
          <p>
            <strong className="text-ink">Privacy</strong> — settings, bookmarks and (optionally) your API token live in
            your browser's storage only. Tokens are transmitted solely to *.vndb.org over HTTPS.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <ChapterMarker kana="旅" title="Begin again" />
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/v" className="btn-primary"><Icon name="book" size={15} /> Browse novels</a>
          <a href="/stats" className="btn-ghost"><Icon name="chart" size={15} /> The chronicle</a>
          <a href="/about" className="btn-quiet">You are here</a>
        </div>
      </Reveal>
    </div>
  );
}
