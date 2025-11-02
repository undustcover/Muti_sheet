export type Route =
  | { name: 'home' }
  | { name: 'table'; tableId?: string }
  | { name: 'register' }
  | { name: 'invite'; token?: string }
  | { name: 'admin' };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'home') return { name: 'home' };
  if (parts[0] === 'table') {
    return { name: 'table', tableId: parts[1] };
  }
  if (parts[0] === 'register') return { name: 'register' };
  if (parts[0] === 'invite') return { name: 'invite', token: parts[1] };
  if (parts[0] === 'admin') return { name: 'admin' };
  return { name: 'home' };
}

export function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}