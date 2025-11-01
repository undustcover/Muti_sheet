import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export type ListRecordsResp = { total: number; page: number; pageSize: number; items: any[] };

// 统一处理 401：登出并跳回登录页
async function ensureOk(resp: Response, fallbackMsg: string) {
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401) {
      await logout();
      navigateTo('/');
      throw new Error('未登录或登录已过期，已为您跳转到登录页面');
    }
    throw new Error(text || `${fallbackMsg}(${resp.status})`);
  }
}

// 列表读取（分页）
export async function apiListRecords(tableId: string, params?: { page?: number; pageSize?: number; q?: string }): Promise<ListRecordsResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params?.q) qs.set('q', params.q);
  const url = `${API_BASE}/tables/${tableId}/records${qs.toString() ? `?${qs.toString()}` : ''}`;
  const resp = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
  await ensureOk(resp, '获取记录列表失败');
  const data = await resp.json();
  const total = Number(data?.total ?? 0);
  const page = Number(data?.page ?? (params?.page ?? 1));
  const pageSize = Number(data?.pageSize ?? (params?.pageSize ?? 20));
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return { total, page, pageSize, items };
}

// 创建记录：兼容后端返回 { record: { id } } 或 { id }
export async function apiCreateRecord(
  tableId: string,
  rowData: Record<string, any>
): Promise<{ id: string }>
{
  const resp = await fetch(`${API_BASE}/tables/${tableId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data: rowData || {} }),
  });
  await ensureOk(resp, '创建记录失败');
  const json = await resp.json();
  const id = (json?.id ?? json?.record?.id) as string | undefined;
  if (!id) {
    throw new Error('后端未返回有效的记录ID');
  }
  return { id };
}

// 局部更新记录：仅传变更字段
export async function apiUpdateRecord(recordId: string, patchData: Record<string, any>): Promise<{ id: string }>
{
  const resp = await fetch(`${API_BASE}/records/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data: patchData || {} }),
  });
  await ensureOk(resp, '更新记录失败');
  return resp.json();
}

// 批量：创建/更新/删除（事务）
export async function apiBatchRecords(tableId: string, payload: {
  create?: Array<{ data: Record<string, any> }>,
  update?: Array<{ recordId: string; data: Record<string, any> }>,
  delete?: string[],
}): Promise<{ created: string[]; updated: string[]; deleted: string[] }>
{
  const resp = await fetch(`${API_BASE}/tables/${tableId}/records:batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload || {}),
  });
  await ensureOk(resp, '批量写入记录失败');
  return resp.json();
}