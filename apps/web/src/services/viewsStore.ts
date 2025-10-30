// 统一视图配置接口与本地持久化实现
// 契约：GET/POST /tables/{id}/views
// 目前先用 localStorage 落库，未来可替换为真实后端

export type ViewKind = 'table' | 'query' | 'kanban' | 'calendar' | 'gantt' | 'gallery' | 'form';

export type BaseViewConfig = {
  id: string;
  tableId: string;
  name: string;
  kind: ViewKind;
  protect?: 'public' | 'locked' | 'personal';
};

// 通用表格视图配置（列可见性、排序、冻结列、行高、列宽、颜色规则等）
export type GridConfig = {
  columnVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  sorting?: { id: string; desc?: boolean }[];
  freezeCount?: number;
  rowHeight?: 'low' | 'medium' | 'high' | 'xhigh';
  columnWidths?: Record<string, number>;
  columnColors?: Record<string, string>;
  colorRules?: any;
  statsAggByField?: Record<string, string>;
};

export type QueryConfig = GridConfig & {
  query?: string;
  filterGroup?: any; // ConditionGroup（沿用现有类型，后端阶段再细化）
};

export type KanbanConfig = {
  groupFieldId: string; // 单选/SingleSelect 字段ID
  orderBy?: { id: string; desc?: boolean } | null; // 卡片内排序
};

export type CalendarConfig = {
  startDateFieldId: string;
  endDateFieldId?: string; // 可选：无结束日期时按一天处理
};

export type ViewConfig = BaseViewConfig & {
  config: GridConfig | QueryConfig | KanbanConfig | CalendarConfig;
};

const LS_KEY = 'sheets.views';

type StoreShape = Record<string, ViewConfig[]>; // tableId -> views

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {}
}

export function listViews(tableId: string): ViewConfig[] {
  const store = readStore();
  return store[tableId] ?? [];
}

export function upsertView(tableId: string, view: ViewConfig): ViewConfig[] {
  const store = readStore();
  const arr = store[tableId] ?? [];
  const idx = arr.findIndex(v => v.id === view.id);
  const next = idx >= 0 ? (arr.map((v, i) => (i === idx ? view : v))) : [...arr, view];
  store[tableId] = next;
  writeStore(store);
  return next;
}

export function removeView(tableId: string, viewId: string): ViewConfig[] {
  const store = readStore();
  const arr = store[tableId] ?? [];
  const next = arr.filter(v => v.id !== viewId);
  store[tableId] = next;
  writeStore(store);
  return next;
}

export function getView(tableId: string, viewId: string): ViewConfig | null {
  const store = readStore();
  const arr = store[tableId] ?? [];
  return arr.find(v => v.id === viewId) ?? null;
}

// 兼容后端接口形态（占位实现）
export async function apiListViews(tableId: string): Promise<ViewConfig[]> {
  // GET /tables/{id}/views
  return listViews(tableId);
}

export async function apiSaveView(tableId: string, view: ViewConfig): Promise<ViewConfig[]> {
  // POST /tables/{id}/views
  return upsertView(tableId, view);
}

export async function apiDeleteView(tableId: string, viewId: string): Promise<ViewConfig[]> {
  // DELETE /tables/{id}/views/{viewId}
  return removeView(tableId, viewId);
}