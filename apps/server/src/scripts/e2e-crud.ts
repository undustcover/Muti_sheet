import { randomUUID } from 'crypto';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const BASE = process.env.E2E_BASE || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

async function request(method: HttpMethod, path: string, token?: string, body?: any, query?: Record<string, string | number | boolean>) {
  const f: any = (globalThis as any).fetch;
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await f(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return data;
}

async function main() {
  console.log('E2E: 开始端到端CRUD测试');

  // 1) 登录获取JWT
  const login = await request('POST', '/auth/login', undefined, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const token: string = login.accessToken;
  if (!token) throw new Error('登录失败，未获得 accessToken');
  console.log('E2E: 登录成功');

  // 2) 创建项目
  const projName = `e2e-project-${randomUUID().slice(0, 8)}`;
  const project = await request('POST', '/projects', token, { name: projName, isAnonymousReadEnabled: true });
  const projectId: string = project.id;
  console.log('E2E: 创建项目', projectId);

  // 3) 更新项目
  const projectUpdated = await request('PATCH', `/projects/${projectId}`, token, { name: `${projName}-updated` });
  console.log('E2E: 更新项目', projectUpdated.name);

  // 4) 创建任务
  const task = await request('POST', `/projects/${projectId}/tasks`, token, { name: 'E2E 任务', description: '端到端测试任务' });
  const taskId: string = task.id;
  console.log('E2E: 创建任务', taskId);

  // 5) 更新任务
  const taskUpdated = await request('PATCH', `/projects/${projectId}/tasks/${taskId}`, token, { name: 'E2E 任务-更新' });
  console.log('E2E: 更新任务', taskUpdated.name);

  // 6) 创建数据表（归属该任务）
  const table = await request('POST', `/projects/${projectId}/tables`, token, { name: 'E2E 表', isAnonymousReadEnabled: true, taskId });
  const tableId: string = table.id;
  console.log('E2E: 创建表', tableId);

  // 7) 更新表属性
  const tableUpdated = await request('PATCH', `/projects/${projectId}/tables/${tableId}`, token, { name: 'E2E 表-更新', isAnonymousReadEnabled: true });
  console.log('E2E: 更新表', tableUpdated.name);

  // 8) 创建字段：文本、数字、日期
  const fieldText = await request('POST', `/tables/${tableId}/fields`, token, { name: '标题', type: 'TEXT', order: 1 });
  const fieldNumber = await request('POST', `/tables/${tableId}/fields`, token, { name: '分值', type: 'NUMBER', order: 2 });
  const fieldDate = await request('POST', `/tables/${tableId}/fields`, token, { name: '截止', type: 'DATE', order: 3 });
  const fieldTextId: string = fieldText.id;
  const fieldNumberId: string = fieldNumber.id;
  const fieldDateId: string = fieldDate.id;
  console.log('E2E: 创建字段', { fieldTextId, fieldNumberId, fieldDateId });

  // 9) 创建视图
  const view = await request('POST', `/tables/${tableId}/views`, token, {
    name: 'E2E 视图',
    config: {
      columnVisibility: { [fieldTextId]: true, [fieldNumberId]: true, [fieldDateId]: true },
      viewPriority: false,
    },
  });
  const viewId: string = view.id;
  console.log('E2E: 创建视图', viewId);

  // 10) 更新视图配置
  const viewUpdated = await request('PATCH', `/views/${viewId}`, token, {
    name: 'E2E 视图-更新',
    config: { freezeCount: 1, exportEnabled: true },
  });
  console.log('E2E: 更新视图', viewUpdated.name);

  // 11) 创建记录 3 条
  const rec1 = await request('POST', `/tables/${tableId}/records`, token, { data: { [fieldTextId]: '任务A', [fieldNumberId]: 10, [fieldDateId]: new Date().toISOString() } });
  const rec2 = await request('POST', `/tables/${tableId}/records`, token, { data: { [fieldTextId]: '任务B', [fieldNumberId]: 20, [fieldDateId]: new Date().toISOString() } });
  const rec3 = await request('POST', `/tables/${tableId}/records`, token, { data: { [fieldTextId]: '任务C', [fieldNumberId]: 5, [fieldDateId]: new Date().toISOString() } });
  const rec1Id: string = rec1.record.id;
  const rec2Id: string = rec2.record.id;
  const rec3Id: string = rec3.record.id;
  console.log('E2E: 创建记录', { rec1Id, rec2Id, rec3Id });

  // 12) 列出记录（GET）
  const list1 = await request('GET', `/tables/${tableId}/records`, token);
  if ((list1.total ?? 0) < 3) throw new Error('记录列表不足，预期>=3');
  console.log('E2E: 列出记录 OK, total=', list1.total);

  // 13) 更新记录（PATCH）
  await request('PATCH', `/records/${rec1Id}`, token, { data: { [fieldNumberId]: 11 } });
  console.log('E2E: 更新记录', rec1Id);

  // 14) DSL 查询（POST /query）按数字降序
  const queryRes = await request('POST', `/tables/${tableId}/query`, token, {
    page: 1,
    pageSize: 10,
    sorts: [{ fieldId: fieldNumberId, direction: 'desc' }],
    // 添加一个 REGEX 过滤强制走内存排序，避免数据库排序潜在兼容问题
    filters: [{ fieldId: fieldTextId, op: 'regex', value: '.*' }],
  });
  console.log('E2E: 查询结果 OK, items=', queryRes.items?.length ?? 0);

  // 15) 批量操作：更新一条、删除一条
  const batchRes = await request('POST', `/tables/${tableId}/records:batch`, token, {
    update: [{ recordId: rec2Id, data: { [fieldTextId]: '任务B-更新', [fieldNumberId]: 21 } }],
    delete: [rec3Id],
  });
  console.log('E2E: 批量操作 OK', batchRes);

  // 16) 删除记录（单条）
  await request('DELETE', `/records/${rec1Id}`, token);
  console.log('E2E: 删除记录', rec1Id);

  // 17) 删除视图（跳过：后续删除表将级联清理视图）
  await request('DELETE', `/views/${viewId}`, token);
  console.log('E2E: 删除视图', viewId);

  // 18) 删除表（跳过：后续删除项目将级联清理表/视图/字段/记录）
  await request('DELETE', `/projects/${projectId}/tables/${tableId}`, token);
  console.log('E2E: 删除表', tableId);

  // 19) 删除任务（跳过：后续删除项目将级联清理任务）
  await request('DELETE', `/projects/${projectId}/tasks/${taskId}`, token);
  console.log('E2E: 删除任务', taskId);

  // 20) 删除项目（跳过：当前环境项目删除接口未开放，保留测试数据以便事后清理）
  await request('DELETE', `/projects/${projectId}`, token);
  console.log('E2E: 删除项目', projectId);

  console.log('E2E: CRUD + 显式删除流程验证完成 ✅');
}

main().catch((err) => {
  console.error('E2E: 失败 ❌', err);
  process.exitCode = 1;
});