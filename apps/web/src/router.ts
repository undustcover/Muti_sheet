export type Route =
  | { name: 'home' }
  | { name: 'table'; tableId?: string };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'home') return { name: 'home' };
  if (parts[0] === 'table') {
    return { name: 'table', tableId: parts[1] };
  }
  return { name: 'home' };
}

export function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}