import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export type SpaceTable = { id: string; name: string; projectId?: string; description?: string };
export type SpaceTask = { id: string; name: string; tables?: SpaceTable[] };
export type SpaceProject = {
  id: string;
  name: string;
  tasks?: SpaceTask[];
  tables?: SpaceTable[];
};

// 统一将后端 { project: { id, name }, tasks: [{ id, name, tables[] }], tables: [] } 结构映射为简单的 SpaceProject
function mapProjectsPayload(payload: any): SpaceProject[] {
  const arr = Array.isArray(payload?.projects) ? payload.projects : Array.isArray(payload) ? payload : [];
  return arr.map((p: any) => ({
    id: p?.project?.id ?? p?.id,
    name: p?.project?.name ?? p?.name,
    tasks: Array.isArray(p?.tasks)
      ? p.tasks.map((t: any) => ({
          id: t.id,
          name: t.name,
          tables: Array.isArray(t?.tables)
            ? t.tables.map((tb: any) => ({ id: tb.id, name: tb.name, projectId: tb.projectId }))
            : [],
        }))
      : [],
    tables: Array.isArray(p?.tables)
      ? p.tables.map((t: any) => ({ id: t.id, name: t.name, projectId: t.projectId }))
      : [],
  }));
}

export async function apiListMySpace(): Promise<SpaceProject[]> {
  const resp = await fetch(`${API_BASE}/space/my`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `获取我的空间失败(${resp.status})`);
  }
  const data = await resp.json();
  return mapProjectsPayload(data);
}

export async function apiListPublicSpace(): Promise<SpaceProject[]> {
  // 后端路由为 /space/project（公开项目空间，需登录但匿名只读受控）
  const resp = await fetch(`${API_BASE}/space/project`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `获取项目空间失败(${resp.status})`);
  }
  const data = await resp.json();
  return mapProjectsPayload(data);
}

// 前端通知：空间数据可能发生变化（新建/重命名/删除等），主页应刷新
export function notifySpaceChanged() {
  try {
    window.dispatchEvent(new CustomEvent('space:changed'));
  } catch {}
}