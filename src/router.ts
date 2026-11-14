import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'board'; id: string }
  | { name: 'sketch'; id: string; panelId: string }
  | { name: 'play'; id: string }
  | { name: 'film'; id: string }
  | { name: 'print'; id: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'board' && parts[1]) {
    const id = parts[1];
    if (parts[2] === 'sketch' && parts[3]) return { name: 'sketch', id, panelId: parts[3] };
    if (parts[2] === 'play') return { name: 'play', id };
    if (parts[2] === 'film') return { name: 'film', id };
    if (parts[2] === 'print') return { name: 'print', id };
    return { name: 'board', id };
  }
  return { name: 'home' };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
