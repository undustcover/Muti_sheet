import { API_BASE, authHeaders } from './auth';

export type RecentTable = { id: string; name: string; description?: string };

export async function apiListRecentTables(): Promise<RecentTable[]> {
  const resp = await fetch(`${API_BASE}/home/recent-tables`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `获取最近编辑失败(${resp.status})`);
  }
  const data = await resp.json();
  return Array.isArray(data) ? data : (data?.tables || []);
}