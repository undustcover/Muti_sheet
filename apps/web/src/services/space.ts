import { API_BASE, authHeaders } from './auth';

export type SpaceProject = {
  id: string;
  name: string;
  tables?: Array<{ id: string; name: string; description?: string }>;
};

export async function apiListMySpace(): Promise<SpaceProject[]> {
  const resp = await fetch(`${API_BASE}/space/my`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `获取我的空间失败(${resp.status})`);
  }
  const data = await resp.json();
  return Array.isArray(data) ? data : (data?.projects || []);
}

export async function apiListPublicSpace(): Promise<SpaceProject[]> {
  const resp = await fetch(`${API_BASE}/space/public`, { headers: { 'Content-Type': 'application/json' } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `获取公开空间失败(${resp.status})`);
  }
  const data = await resp.json();
  return Array.isArray(data) ? data : (data?.projects || []);
}