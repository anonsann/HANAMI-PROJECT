import { Link } from 'react-router-dom';
import { useTitle } from '../hooks';
import { Icon } from '../components/icons';

export default function NotFoundPage() {
  useTitle('Lost chapter');
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-jp text-6xl text-brand/80 text-glow">迷路</p>
      <h1 className="mt-4 font-display text-2xl tracking-[0.15em] text-ink">This chapter was never written</h1>
      <p className="mt-3 font-serif text-sm leading-7 text-mute">
        The page you seek does not exist — perhaps it was a route deleted by a bad end.
        The archive, however, still hums with stories.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn-primary">
          <Icon name="home" size={16} /> Return to the prologue
        </Link>
        <Link to="/v" className="btn-ghost">
          <Icon name="book" size={16} /> Browse the archive
        </Link>
      </div>
    </div>
  );
}
