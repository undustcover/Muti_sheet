import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export async function apiCreateProject(name: string, isAnonymousReadEnabled?: boolean): Promise<{ id: string; name: string }> {
  const resp = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, isAnonymousReadEnabled: !!isAnonymousReadEnabled }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `创建项目失败(${resp.status})`);
  }
  return resp.json();
}

export async function apiDeleteProject(projectId: string): Promise<{ id: string }> {
  const url = `${API_BASE}/projects/${projectId}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!resp.ok) {
    const text = await resp.text();
    // Debug: log failing DELETE details to help diagnose 404s
    console.warn('[apiDeleteProject] failed', {
      url,
      projectId,
      status: resp.status,
      statusText: resp.statusText,
      body: text,
    });
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `删除项目失败(${resp.status})`);
  }
  return resp.json();
}