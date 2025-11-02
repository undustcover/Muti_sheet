import { API_BASE, authHeaders, logout } from './auth';
import { navigateTo } from '../router';

export type BackendFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'ATTACHMENT' | 'FORMULA' | 'SINGLE_SELECT' | 'MULTI_SELECT';
export type FieldItem = { id: string; name: string; type?: BackendFieldType; description?: string; visible?: boolean; order?: number; config?: any };

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

// 列出字段（支持匿名，按表/字段权限过滤）
export async function apiListFields(tableId: string): Promise<FieldItem[]> {
  const resp = await fetch(`${API_BASE}/tables/${tableId}/fields`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  await ensureOk(resp, '获取字段列表失败');
  const data = await resp.json();
  return Array.isArray(data) ? data as FieldItem[] : [];
}

// 新增字段
export async function apiCreateField(
  tableId: string,
  payload: { name: string; type: BackendFieldType; description?: string; visible?: boolean; order?: number; options?: any[]; format?: any; formula?: any }
): Promise<FieldItem> {
  const resp = await fetch(`${API_BASE}/tables/${tableId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await ensureOk(resp, '创建字段失败');
  return resp.json();
}

// 更新字段
export async function apiUpdateField(
  fieldId: string,
  payload: Partial<{ name: string; type: BackendFieldType; description: string; visible: boolean; order: number; options: any[]; format: any; formula: any }>
): Promise<FieldItem> {
  const resp = await fetch(`${API_BASE}/tables/unused/fields/${fieldId}`.replace('/tables/unused', ''), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await ensureOk(resp, '更新字段失败');
  return resp.json();
}

// 删除字段
export async function apiDeleteField(fieldId: string): Promise<FieldItem> {
  const resp = await fetch(`${API_BASE}/tables/unused/fields/${fieldId}`.replace('/tables/unused', ''), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  await ensureOk(resp, '删除字段失败');
  return resp.json();
}

// 类型映射：后端 -> 前端
export function mapBackendTypeToUI(t?: BackendFieldType): 'text' | 'number' | 'date' | 'single' | 'multi' | 'attachment' | 'formula' {
  if (t === 'NUMBER') return 'number';
  if (t === 'DATE') return 'date';
  if (t === 'SINGLE_SELECT') return 'single';
  if (t === 'MULTI_SELECT') return 'multi';
  if (t === 'ATTACHMENT') return 'attachment';
  if (t === 'FORMULA') return 'formula';
  return 'text';
}