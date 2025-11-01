import { APIRequestContext, Page, request as playwrightRequest } from '@playwright/test';

type LoginResult = { token: string; user: any };

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

export async function loginAsAdmin(req?: APIRequestContext): Promise<LoginResult> {
  const request = req ?? (await playwrightRequest.newContext());
  const resp = await request.post(`${API_BASE}/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL || 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'admin123' },
  });
  // 后端可能返回 200 或 201，且 token 字段名可能为 access_token/token/accessToken
  if (!resp.ok()) {
    throw new Error(`Login failed: ${resp.status()} ${await resp.text()}`);
  }
  const data = await resp.json();
  const token: string = data?.access_token || data?.token || data?.accessToken || '';
  if (!token) throw new Error('Login response missing token');
  // Ensure user object
  let user = data?.user;
  if (!user) {
    const me = await request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!me.ok()) throw new Error(`Fetch me failed: ${me.status()} ${await me.text()}`);
    user = await me.json();
  }
  return { token, user };
}

export async function bootstrapStorageState(page: Page, login: LoginResult) {
  await page.addInitScript(([token, user]) => {
    try {
      localStorage.setItem('auth.token', token as string);
      localStorage.setItem('auth.user', JSON.stringify(user));
    } catch {}
  }, [login.token, login.user]);
}