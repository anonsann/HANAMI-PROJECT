import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Shell, ErrorBoundary } from './components/Shell';
import { Spinner } from './components/ui';

const HomePage = lazy(() => import('./pages/HomePage'));
const VnBrowsePage = lazy(() => import('./pages/VnBrowsePage'));
const VnDetailPage = lazy(() => import('./pages/VnDetailPage'));
const ReleasesBrowsePage = lazy(() => import('./pages/ReleasesBrowsePage'));
const ReleaseDetailPage = lazy(() => import('./pages/ReleaseDetailPage'));
const ProducersPage = lazy(() => import('./pages/ProducersPage'));
const CharactersPage = lazy(() => import('./pages/CharactersPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const TraitsPage = lazy(() => import('./pages/TraitsPage'));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const RoulettePage = lazy(() => import('./pages/RoulettePage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const MyListPage = lazy(() => import('./pages/MyListPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const ProducerDetailPage = lazy(() => import('./pages/ProducersPage').then((m) => ({ default: m.ProducerDetailPage })));
const CharacterDetailPage = lazy(() => import('./pages/CharactersPage').then((m) => ({ default: m.CharacterDetailPage })));
const StaffDetailPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffDetailPage })));
const TagDetailPage = lazy(() => import('./pages/TagsPage').then((m) => ({ default: m.TagDetailPage })));
const TraitDetailPage = lazy(() => import('./pages/TraitsPage').then((m) => ({ default: m.TraitDetailPage })));

function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-faint">
        <Spinner size={30} />
        <p className="font-jp text-xs tracking-[0.4em]">読み込み</p>
      </div>
    </div>
  );
}

function S({ children, boundary }: { children: React.ReactNode; boundary?: boolean }) {
  return <Suspense fallback={<PageLoader />}>{boundary ? <ErrorBoundary>{children}</ErrorBoundary> : children}</Suspense>;
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Shell />,
      errorElement: <ErrorBoundary><NotFoundPage /></ErrorBoundary>,
      children: [
        { index: true, element: <S boundary><HomePage /></S> },
        { path: 'v', element: <S boundary><VnBrowsePage /></S> },
        { path: 'v/:id', element: <S boundary><VnDetailPage /></S> },
        { path: 'r', element: <S boundary><ReleasesBrowsePage /></S> },
        { path: 'r/:id', element: <S boundary><ReleaseDetailPage /></S> },
        { path: 'p', element: <S boundary><ProducersPage /></S> },
        { path: 'p/:id', element: <S boundary><ProducerDetailPage /></S> },
        { path: 'c', element: <S boundary><CharactersPage /></S> },
        { path: 'c/:id', element: <S boundary><CharacterDetailPage /></S> },
        { path: 's', element: <S boundary><StaffPage /></S> },
        { path: 's/:id', element: <S boundary><StaffDetailPage /></S> },
        { path: 'g', element: <S boundary><TagsPage /></S> },
        { path: 'g/:id', element: <S boundary><TagDetailPage /></S> },
        { path: 'i', element: <S boundary><TraitsPage /></S> },
        { path: 'i/:id', element: <S boundary><TraitDetailPage /></S> },
        { path: 'quotes', element: <S boundary><QuotesPage /></S> },
        { path: 'random', element: <S boundary><RoulettePage /></S> },
        { path: 'compare', element: <S boundary><ComparePage /></S> },
        { path: 'stats', element: <S boundary><StatsPage /></S> },
        { path: 'list', element: <S boundary><MyListPage /></S> },
        { path: 'settings', element: <S boundary><SettingsPage /></S> },
        { path: 'about', element: <S boundary><AboutPage /></S> },
        { path: '*', element: <S boundary><NotFoundPage /></S> }
      ]
    }
  ],
  { basename: '/' }
);

export default function App() {
  return <RouterProvider router={router} />;
}
