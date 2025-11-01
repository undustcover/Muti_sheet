import { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

export async function createProject(request: APIRequestContext, token: string, name = `E2E 项目 ${Date.now()}`) {
  const resp = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name },
  });
  if (resp.status() !== 201 && resp.status() !== 200) {
    throw new Error(`Create project failed: ${resp.status()} ${await resp.text()}`);
  }
  return await resp.json();
}

export async function createTask(request: APIRequestContext, token: string, projectId: string, name = `E2E 任务 ${Date.now()}`) {
  const resp = await request.post(`${API_BASE}/projects/${projectId}/tasks`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name },
  });
  if (resp.status() !== 201 && resp.status() !== 200) {
    throw new Error(`Create task failed: ${resp.status()} ${await resp.text()}`);
  }
  return await resp.json();
}

export async function createTable(request: APIRequestContext, token: string, projectId: string, name = `E2E 表 ${Date.now()}`, taskId?: string) {
  const resp = await request.post(`${API_BASE}/projects/${projectId}/tables`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, taskId },
  });
  if (resp.status() !== 201 && resp.status() !== 200) {
    throw new Error(`Create table failed: ${resp.status()} ${await resp.text()}`);
  }
  return await resp.json();
}