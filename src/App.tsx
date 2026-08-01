import { useCallback, useEffect, useState } from 'react';
import { BrandGuidelinesPage } from './guidelines/BrandGuidelinesPage';
import { LoadingScreenDemo } from './game/screens/LoadingScreen';
import { TitleScreen } from './game/screens/TitleScreen';
import { BrandIcon } from './brand/components/BrandIcon';
import { GameShell } from './play/ui/GameShell';

/**
 * Tiny pathname router (no dependency). Routes:
 *   /          → brand guidelines (internal dev page)
 *   /loading   → full loading screen demo
 *   /title     → full title screen demo
 *   /play      → THE GAME (RESET//07 full playable build)
 *
 * The game ships as a portable build (`base: './'`) and may be served from a
 * subpath (e.g. Cloudflare Pages at /reset07/play). `detectBase` reads the
 * current location once so the same build routes correctly both standalone
 * (/play, local dev) and under a known deployment prefix (/reset07/play).
 */
function detectBase(): string {
  const match = window.location.pathname.match(/^\/(reset07)(?=\/|$)/);
  return match ? `/${match[1]}` : '';
}

function usePathname(): { path: string; navigate: (to: string) => void } {
  const normalize = useCallback(() => {
    const base = detectBase();
    const raw = window.location.pathname.replace(/\/+$/, '') || '/';
    return base && raw.startsWith(base) ? raw.slice(base.length) || '/' : raw;
  }, []);
  const [path, setPath] = useState(normalize);

  useEffect(() => {
    const onPop = () => setPath(normalize());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [normalize]);

  const navigate = useCallback(
    (to: string) => {
      const base = detectBase();
      const url = `${base}${to === '/' ? '/' : to}`;
      window.history.pushState({}, '', url);
      setPath(normalize());
    },
    [normalize],
  );

  return { path, navigate };
}

function Toolbar({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const setAttr = (name: 'motion' | 'effects' | 'flash') => (value: string) => {
    document.documentElement.dataset[name] = value;
  };

  return (
    <div className="g-toolbar">
      <span className="g-toolbar__brand">
        <BrandIcon size={22} decorative />
        <span className="type-data-s text-secondary">RESET//07 — BRAND KIT (DEV)</span>
      </span>
      <a href="#/play" onClick={(e) => { e.preventDefault(); navigate('/play'); }} className={['g-toolbar__link', path === '/play' ? 'is-active' : ''].filter(Boolean).join(' ')} style={{ borderColor: 'rgba(56,232,255,0.5)', color: '#38E8FF' }}>
        ▶ PLAY
      </a>
      <nav className="g-toolbar__links" aria-label="Dev routes">
        <a href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className={['g-toolbar__link', path === '/' ? 'is-active' : ''].filter(Boolean).join(' ')}>
          Guidelines
        </a>
        <a href="#/loading" onClick={(e) => { e.preventDefault(); navigate('/loading'); }} className={['g-toolbar__link', path === '/loading' ? 'is-active' : ''].filter(Boolean).join(' ')}>
          Loading
        </a>
        <a href="#/title" onClick={(e) => { e.preventDefault(); navigate('/title'); }} className={['g-toolbar__link', path === '/title' ? 'is-active' : ''].filter(Boolean).join(' ')}>
          Title
        </a>
        <a href="#/play" onClick={(e) => { e.preventDefault(); navigate('/play'); }} className={['g-toolbar__link', path === '/play' ? 'is-active' : ''].filter(Boolean).join(' ')}>
          Play
        </a>
      </nav>
      <nav className="g-toolbar__links" aria-label="Simulation toggles">
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('motion')('full')}>
          Motion: full
        </button>
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('motion')('reduced')}>
          Motion: reduced
        </button>
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('effects')('full')}>
          Effects: full
        </button>
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('effects')('low')}>
          Effects: low
        </button>
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('flash')('full')}>
          Flash: on
        </button>
        <button type="button" className="g-toolbar__link" onClick={() => setAttr('flash')('reduced')}>
          Flash: reduced
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const { path, navigate } = usePathname();
  const isDemo = path === '/loading' || path === '/title';

  if (path === '/play') {
    return <GameShell />;
  }

  return (
    <>
      <Toolbar path={path} navigate={navigate} />
      {path === '/' && <BrandGuidelinesPage />}
      {path === '/loading' && <LoadingScreenDemo loop />}
      {path === '/title' && <TitleScreen animateLogo />}
      {isDemo && (
        <a href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-button brand-button--sm g-demo-exit">
          ✕ Exit preview
        </a>
      )}
    </>
  );
}
