import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export async function apiCreateTable(projectId: string, name: string, isAnonymousReadEnabled?: boolean, taskId?: string, skipDefaultFields?: boolean): Promise<{ id: string; name: string; projectId: string; taskId?: string }> {
  const resp = await fetch(`${API_BASE}/projects/${projectId}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, isAnonymousReadEnabled: !!isAnonymousReadEnabled, taskId, skipDefaultFields: !!skipDefaultFields }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    try { console.warn('[apiCreateTable] failed', { projectId, payload: { name, isAnonymousReadEnabled, taskId, skipDefaultFields }, status: resp.status, body: text }); } catch {}
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `创建数据表失败(${resp.status})`);
  }
  const json = await resp.json().catch(() => undefined);
  const id = (json?.id ?? json?.table?.id) as string | undefined;
  const tname = (json?.name ?? json?.table?.name ?? name) as string | undefined;
  if (!id) {
    try { console.warn('[apiCreateTable] ok but missing id', { projectId, body: json }); } catch {}
    throw new Error('后端未返回有效的数据表ID');
  }
  return { id, name: tname || name, projectId, taskId };
}

export async function apiListTables(projectId: string): Promise<Array<{ id: string; name: string }>> {
  const resp = await fetch(`${API_BASE}/projects/${projectId}/tables`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `获取数据表列表失败(${resp.status})`);
  }
  return resp.json();
}

export async function apiDeleteTable(projectId: string, tableId: string): Promise<{ id: string }> {
  const url = `${API_BASE}/projects/${projectId}/tables/${tableId}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    if (resp.status === 403) {
      throw new Error(text || '你没有权限删除其他人的表格');
    }
    // 明确 404 路由缺失的情况，给出友好提示
    if (resp.status === 404 && /Cannot DELETE/.test(text || '')) {
      throw new Error('后端未提供删除表接口（404），请更新后端或联系管理员');
    }
    throw new Error(text || `删除数据表失败(${resp.status})`);
  }
  return resp.json();
}