const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000/api/v1';

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export async function login(email: string, password: string) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `登录失败(${resp.status})`);
  }
  const data = await resp.json();
  const token = data?.access_token || data?.token || data?.accessToken || '';
  const user: AuthUser | null = data?.user || null;
  if (token) setToken(token);
  let finalUser = user;
  if (!finalUser && token) {
    // 登录后拉取用户信息
    finalUser = await fetchMe();
  }
  if (finalUser) setUser(finalUser);
  notifyAuthChanged();
  return { token, user: finalUser };
}

export async function logout() {
  const token = getToken();
  try {
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
  } finally {
    setToken(null);
    setUser(null);
    notifyAuthChanged();
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return getUser();
    const user = await resp.json();
    if (user) setUser(user);
    return user;
  } catch {
    return getUser();
  }
}

export async function authBootstrap() {
  const token = getToken();
  const user = getUser();
  if (token && !user) {
    await fetchMe();
  }
}

export function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export { API_BASE };

export function notifyAuthChanged() {
  try {
    window.dispatchEvent(new CustomEvent('auth:changed'));
  } catch {}
}
