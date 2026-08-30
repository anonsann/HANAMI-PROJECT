import { useCallback, useEffect, useState } from 'react';
import { Icon } from './icons';
import { GlassPanel } from './ui';

export interface LightboxItem {
  src: string;
  alt: string;
}

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const count = items.length;
  const current = items[index];

  const next = useCallback(() => onNavigate((index + 1) % count), [index, count, onNavigate]);
  const prev = useCallback(() => onNavigate((index - 1 + count) % count), [index, count, onNavigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [next, prev, onClose]);

  useEffect(() => setLoaded(false), [index]);
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer, ${index + 1} of ${count}`}
      className="fixed inset-0 z-[80] flex flex-col bg-canvas/95 backdrop-blur animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel className="mx-3 mt-3 shrink-0 px-3 py-2" width="100%">
        <div className="flex items-center justify-between gap-3 text-[12px] text-mute">
          <span className="min-w-0 truncate">
            {current.alt} · {index + 1} / {count}
          </span>
          <button type="button" className="btn-quiet p-1" onClick={onClose} aria-label="Close viewer">
            <Icon name="x" size={18} />
          </button>
        </div>
      </GlassPanel>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {count > 1 ? (
          <button type="button" onClick={prev} aria-label="Previous image" className="btn-quiet absolute left-2 z-10 p-2 sm:left-6">
            <Icon name="chevronLeft" size={26} />
          </button>
        ) : null}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          onLoad={() => setLoaded(true)}
          className={`max-h-full max-w-full rounded-sm object-contain shadow-lift transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {count > 1 ? (
          <button type="button" onClick={next} aria-label="Next image" className="btn-quiet absolute right-2 z-10 p-2 sm:right-6">
            <Icon name="chevronRight" size={26} />
          </button>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="flex justify-center gap-1.5 overflow-x-auto px-4 pb-4 no-scrollbar">
          {items.map((it, i) => (
            <button
              key={it.src + i}
              type="button"
              onClick={() => onNavigate(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : 'w-1.5 bg-line hover:bg-faint'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
