import { useCallback } from 'react';
import dayjs from 'dayjs';

export type UseToolbarActionsParams = {
  fieldOps: { removeField: (id: string) => void };
  setColumnColors: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  show: (msg: string, type?: 'info' | 'warning' | 'success' | 'error') => void;
  // optional toolbar-related deps
  histSetData?: (updater: (prev: any[]) => any[]) => void;
  requestMeasure?: () => void;
  openFieldDrawer?: (id: string) => void;
  generateFieldId?: () => string;
};

export function useToolbarActions({ fieldOps, setColumnColors, show, histSetData, requestMeasure, openFieldDrawer, generateFieldId }: UseToolbarActionsParams) {
  const onDeleteField = useCallback((id: string) => {
    fieldOps.removeField(id);
  }, [fieldOps]);

  const onFillColorColumn = useCallback((columnId: string, color: string) => {
    setColumnColors((prev) => ({ ...prev, [columnId]: color }));
    show('整列填色已应用', 'success');
  }, [setColumnColors, show]);

  const onAddRecord = useCallback(() => {
    if (!histSetData) return;
    histSetData((prev) => [{
      id: `rec-${prev.length + 1}`,
      text: String(prev.length + 1),
      number: 0,
      date: dayjs().toISOString(),
      select: null,
      multiSelect: [],
      relation: null,
      user: null,
    }, ...prev]);
    requestMeasure?.();
  }, [histSetData, requestMeasure]);

  const onCreateField = useCallback(() => {
    if (!openFieldDrawer) return;
    const id = generateFieldId ? generateFieldId() : `field-${Date.now()}`;
    openFieldDrawer(id);
  }, [openFieldDrawer, generateFieldId]);

  const onEditField = useCallback((id: string) => {
    openFieldDrawer?.(id);
  }, [openFieldDrawer]);

  const onSortOpen = useCallback(() => {
    show('排序面板暂未实现', 'info');
  }, [show]);

  return { onDeleteField, onFillColorColumn, onAddRecord, onCreateField, onEditField, onSortOpen } as const;
}