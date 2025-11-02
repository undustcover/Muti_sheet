import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export async function apiCreateTask(projectId: string, name: string, description?: string): Promise<{ id: string; name: string; projectId: string; description?: string }> {
  const url = `${API_BASE}/projects/${projectId}/tasks`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    try {
      console.warn('[apiCreateTask] failed', {
        url,
        projectId,
        payload: { name, description },
        status: resp.status,
        statusText: resp.statusText,
        body: text,
      });
    } catch {}
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `创建任务失败(${resp.status})`);
  }
  const json = await resp.json().catch(() => undefined);
  const id = (json?.id ?? json?.task?.id) as string | undefined;
  const tname = (json?.name ?? json?.task?.name ?? name) as string | undefined;
  if (!id) {
    try { console.warn('[apiCreateTask] ok but missing id', { url, projectId, body: json }); } catch {}
    throw new Error('后端未返回有效的任务ID');
  }
  return { id, name: tname || name, projectId, description };
}

export async function apiListTasks(projectId: string): Promise<Array<{ id: string; name: string }>> {
  const resp = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `获取任务列表失败(${resp.status})`);
  }
  return resp.json();
}

export async function apiDeleteTask(projectId: string, taskId: string): Promise<{ id: string }> {
  const resp = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, {
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
    throw new Error(text || `删除任务失败(${resp.status})`);
  }
  return resp.json();
}