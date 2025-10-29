/**
 * 获取第一个可见数据字段的 ID（排除隐藏的 'id' 字段）
 */
export function getFirstVisibleFieldId(columnOrder: string[], columnVisibility: Record<string, boolean> = {}): string | null {
  return columnOrder.find(id => id !== 'id' && columnVisibility[id] !== false) || null;
}

/**
 * 判断给定字段是否为第一个可见数据字段（排除隐藏的 'id' 字段）
 */
export function isFirstVisibleField(columnId: string, columnOrder: string[], columnVisibility: Record<string, boolean> = {}): boolean {
  const firstVisibleFieldId = getFirstVisibleFieldId(columnOrder, columnVisibility);
  return firstVisibleFieldId === columnId;
}

/**
 * 获取第一个数据字段的 ID（排除 'id' 字段）- 兼容旧版本
 * @deprecated 使用 getFirstVisibleFieldId 替代
 */
export function getFirstDataFieldId(columnOrder: string[]): string | null {
  return columnOrder.find(id => id !== 'id') || null;
}

/**
 * 判断给定字段是否为第一个数据字段（排除 'id' 字段）- 兼容旧版本
 * @deprecated 使用 isFirstVisibleField 替代
 */
export function isFirstDataField(columnId: string, columnOrder: string[]): boolean {
  const firstDataFieldId = getFirstDataFieldId(columnOrder);
  return firstDataFieldId === columnId;
}