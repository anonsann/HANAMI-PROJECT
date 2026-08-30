import { Link } from 'react-router-dom';
import { useTitle } from '../hooks';
import { Fuzzy, PressureText, Reveal } from '../components/visual';
import { Icon } from '../components/icons';
import { Magnetize } from '../components/visual';

export default function NotFoundPage() {
  useTitle('Lost chapter');
  return (
    <div className="mx-auto max-w-xl py-14 text-center">
      <Reveal>
        <p className="font-jp text-[11px] uppercase tracking-[0.4em] text-faint">迷路 · mayoi</p>
        <div className="mt-3 flex justify-center">
          <Fuzzy>404</Fuzzy>
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold text-brand2">
          This chapter was never written
        </h1>
        <div className="mt-3 flex justify-center">
          <PressureText text="lost the thread" className="w-full" />
        </div>
        <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-mute">
          The page you seek does not exist — perhaps it was a route deleted by a bad end. The archive, however,
          still hums with stories.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Magnetize strength={16}>
            <Link to="/" className="btn-primary">
              <Icon name="home" size={15} /> Return to the prologue
            </Link>
          </Magnetize>
          <Link to="/v" className="btn-ghost">
            <Icon name="book" size={15} /> Browse the archive
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
