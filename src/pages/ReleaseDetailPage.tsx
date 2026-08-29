import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { RELEASE_DETAIL } from '../lib/vndb/fields';
import type { Release } from '../lib/vndb/types';
import { useTitle } from '../hooks';
import { formatVndbDate, formatRating } from '../lib/format';
import { languageName, mediaTypeName, platformName, producerTypeName, resolutionLabel, voicedLabel } from '../lib/vndb/enums';
import { CoverImage, ExtlinkChips } from '../components/data';
import { Reveal } from '../components/visual';
import { Skeleton, ErrorState, EmptyState } from '../components/ui';
import { Icon } from '../components/icons';
import { Lightbox } from '../components/Lightbox';
import { renderDescription } from '../lib/markup';
import { useSettings } from '../store/settings';

export default function ReleaseDetailPage() {
  const { id = '' } = useParams();
  const res = useApi<Release>('release', { filters: ['id', '=', id], fields: RELEASE_DETAIL, results: 1 }, { label: 'release detail' });
  const rel = res.data?.results?.[0];
  useTitle(rel ? rel.title : null);
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const images = useMemo(() => (rel?.images ?? []).filter((i) => i.url), [rel]);

  if (res.status === 'loading') return <div className="mx-auto max-w-5xl"><Skeleton className="h-64 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!rel) return <EmptyState title={`Release ${id} not found.`} />;

  const devs = (rel.producers ?? []).filter((p) => p.developer);
  const pubs = (rel.producers ?? []).filter((p) => p.publisher);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Reveal className="card-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="w-44 shrink-0">
            <CoverImage image={images[0]} alt={rel.title} eager />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="font-jp text-xs tracking-[0.4em] text-brand">リリース</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{rel.title}</h1>
              {rel.alttitle ? <p className="mt-1 font-jp text-mute">{rel.alttitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="chip"><Icon name="calendar" size={11} className="text-gold" /> {formatVndbDate(rel.released)}</span>
              {rel.minage !== null && rel.minage !== undefined ? <span className="chip border-bad/40 text-bad">{rel.minage}+</span> : null}
              {rel.official ? <span className="chip border-good/40 text-good">official</span> : <span className="chip">fan</span>}
              {rel.freeware ? <span className="chip border-gold/40 text-gold">freeware</span> : null}
              {rel.patch ? <span className="chip border-sky/40 text-sky">patch</span> : null}
              {rel.uncensored === true ? <span className="chip">uncensored</span> : null}
              {rel.has_ero ? <span className="chip border-brand/40 text-brand">eroge</span> : null}
            </div>
            {(rel.vns ?? []).length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">Visual novels</p>
                <div className="flex flex-wrap gap-1.5">
                  {(rel.vns ?? []).map((v) => (
                    <Link key={v.id} to={`/v/${v.id}`} className="chip transition-colors hover:border-brand/60 hover:text-brand">
                      <Icon name="book" size={11} className="text-gold" />
                      {v.title ?? v.id}
                      {v.rtype && v.rtype !== 'complete' ? <span className="text-sky">({v.rtype})</span> : null}
                      {v.rating !== null && v.rating !== undefined ? <span className="font-mono text-[10px] text-gold">{formatRating(v.rating)}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal className="card-surface space-y-3 p-5">
          <h2 className="section-title text-sm">Details</h2>
          <table className="table-zen">
            <tbody>
              {[
                ['Released', formatVndbDate(rel.released)],
                ['Platforms', (rel.platforms ?? []).map(platformName).join(', ') || '—'],
                [
                  'Languages',
                  (rel.languages ?? [])
                    .map((l) => `${languageName(l.lang)}${l.mtl ? ' (MTL)' : ''}${l.main ? ' ★' : ''}`)
                    .join(', ') || '—'
                ],
                ['Media', (rel.media ?? []) .map((m) => (m.qty > 0 ? `${mediaTypeName(m.medium)} ×${m.qty}` : mediaTypeName(m.medium))).join(', ') || '—'],
                ['Resolution', resolutionLabel(rel.resolution)],
                ['Voiced', voicedLabel(rel.voiced)],
                ['Engine', rel.engine ?? '—'],
                ['Catalog', rel.catalog ?? '—'],
                ['JAN / GTIN', rel.gtin ?? '—']
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td className="w-32 whitespace-nowrap text-xs uppercase tracking-wider text-faint">{k}</td>
                  <td className="text-mute">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        <Reveal className="space-y-4">
          {devs.length + pubs.length > 0 ? (
            <div className="card-surface space-y-3 p-5">
              <h2 className="section-title text-sm">Companies</h2>
              {devs.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-faint">Developed by</p>
                  <div className="flex flex-wrap gap-1.5">
                    {devs.map((p) => (
                      <Link key={p.id} to={`/p/${p.id}`} className="chip hover:border-gold/60 hover:text-gold">
                        {p.name}
                        {p.type ? <span className="text-[10px] text-faint">({producerTypeName(p.type)})</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {pubs.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-faint">Published by</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pubs.map((p) => (
                      <Link key={p.id} to={`/p/${p.id}`} className="chip hover:border-gold/60 hover:text-gold">
                        {p.name}
                        {p.type ? <span className="text-[10px] text-faint">({producerTypeName(p.type)})</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {rel.notes ? (
            <div className="card-surface p-5">
              <h2 className="section-title text-sm">Notes</h2>
              <p className="mt-2 font-serif text-sm leading-6 text-mute">{renderDescription(rel.notes, spoilerMax, 'rel-notes')}</p>
            </div>
          ) : null}
          <ExtlinkChips links={rel.extlinks} max={10} />
        </Reveal>
      </div>

      {images.length > 1 ? (
        <Reveal>
          <h2 className="section-title mb-3 text-sm">Package art</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <button key={img.id ?? i} type="button" onClick={() => setLightbox(i)} aria-label={`Package image ${i + 1} (${img.type ?? 'scan'})`}>
                <CoverImage image={img} alt={`${rel.title} package ${img.type ?? i}`} sizes="25vw" />
              </button>
            ))}
          </div>
          {lightbox !== null ? (
            <Lightbox items={images.map((img, i) => ({ src: img.url!, alt: `${rel.title} · ${img.type ?? i}` }))} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />
          ) : null}
        </Reveal>
      ) : null}
    </div>
  );
}
