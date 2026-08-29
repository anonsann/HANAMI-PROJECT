import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vndb, ApiError } from '../lib/vndb/client';
import { QUOTE_FULL } from '../lib/vndb/fields';
import type { Quote } from '../lib/vndb/types';
import { useTitle } from '../hooks';
import { PageHeader } from '../components/PageBits';
import { DialogueBox } from '../components/visual';
import { Skeleton, ErrorState } from '../components/ui';
import { Icon } from '../components/icons';

const BATCH = 4;

/** Fetches BATCH random quotes using the documented `or` technique. */
async function fetchRandomQuotes(): Promise<Quote[]> {
  const filters = ['or', ...Array.from({ length: BATCH }, () => ['random', '=', 1])];
  const res = await vndb.query<Quote>('quote', { filters, fields: QUOTE_FULL, results: BATCH }, { label: 'quotes', ttlMs: 0 });
  return res.results;
}

export default function QuotesPage() {
  useTitle('Quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading');
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async (reset = true) => {
    setStatus('loading');
    try {
      const fresh = await fetchRandomQuotes();
      setQuotes((prev) => (reset ? fresh : [...prev, ...fresh]));
      setStatus('ok');
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('network', String(e)));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader kana="名言" title="Voices" actions={
        <button type="button" className="btn-gold" onClick={() => void load(true)} disabled={status === 'loading'}>
          <Icon name="refresh" size={14} /> Other voices
        </button>
      }>
        Fragments that outlived their stories. Sourced from the same collection as the VNDB footer.
      </PageHeader>

      {status === 'loading' && quotes.length === 0 ? (
        <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : status === 'error' && quotes.length === 0 ? (
        <ErrorState error={error} onRetry={() => void load(true)} />
      ) : (
        <div className="space-y-4">
          {quotes.map((q, i) => (
            <DialogueBox
              key={`${q.id}-${i}-${q.quote.slice(0, 12)}`}
              name={
                q.character?.id ? (
                  <Link to={`/c/${q.character.id}`} className="hover:text-brand">{q.character.name}</Link>
                ) : (
                  'Unknown speaker'
                )
              }
              nameIcon="quote"
              footer={
                <span>
                  {q.vn?.id ? (
                    <>
                      from{' '}
                      <Link to={`/v/${q.vn.id}`} className="link-fancy">
                        {q.vn.title ?? q.vn.id}
                      </Link>
                    </>
                  ) : (
                    'from the archive'
                  )}
                </span>
              }
            >
              “{q.quote}”
            </DialogueBox>
          ))}
        </div>
      )}

      {quotes.length > 0 ? (
        <div className="flex justify-center">
          <button type="button" className="btn-ghost" onClick={() => void load(false)} disabled={status === 'loading'}>
            <Icon name="plus" size={14} /> More voices
          </button>
        </div>
      ) : null}
    </div>
  );
}
