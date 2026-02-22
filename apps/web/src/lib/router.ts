import { useState, useEffect, useCallback } from 'react';

export type Route = 'landing' | 'login' | 'signup' | 'dashboard' | 'pets';

function getRouteFromHash(): Route {
  const hash = window.location.hash.slice(1) || '';
  const valid: Route[] = ['landing', 'login', 'signup', 'dashboard', 'pets'];
  return valid.includes(hash as Route) ? (hash as Route) : 'landing';
}

export function useRouter() {
  const [route, setRouteState] = useState<Route>(getRouteFromHash);

  useEffect(() => {
    function onHashChange() {
      setRouteState(getRouteFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = r;
  }, []);

  return { route, navigate };
}
