import { useMemo } from 'react';

export type UseTopbarActionsParams = {
  columnMeta: Record<string, { name: string; type: string; description?: string }>;
  setColumnVisibility: (updater: (v: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  histSetColumnVisibility: (updater: (v: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  setColumnOrder: (updater: (order: string[]) => string[]) => void;
  show: (msg: string, type?: 'info' | 'warning' | 'success' | 'error', opts?: { actionLabel?: string; onAction?: () => void }) => void;
  requestMeasure: () => void;
};

export function useTopbarActions({ columnMeta, setColumnVisibility, histSetColumnVisibility, setColumnOrder, show, requestMeasure }: UseTopbarActionsParams) {
  const showAllHidden = useMemo(() => {
    return () => {
      setColumnVisibility(() => {
        const next: Record<string, boolean> = {};
        Object.keys(columnMeta).forEach((cid) => { next[cid] = true; });
        next['id'] = false; // 保持首字段隐藏
        return next;
      });
    };
  }, [columnMeta, setColumnVisibility]);

  const onToggleFieldVisibility = useMemo(() => {
    return (id: string) => {
      if (id === 'id') { show('首字段已隔离为后台字段，固定隐藏', 'info'); return; }
      histSetColumnVisibility((v) => {
        const isVisible = v[id] !== false;
        if (isVisible) {
          const next = { ...v, [id]: false } as Record<string, boolean | undefined>;
          const nextVisibleCount = Object.keys(columnMeta).filter((cid) => next[cid] !== false).length;
          if (nextVisibleCount === 0) {
            show('至少保留一个可见列', 'warning');
            return v;
          }
          show(`已隐藏字段：${columnMeta[id]?.name ?? id}`, 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
          return next;
        } else {
          const next = { ...v, [id]: true } as Record<string, boolean | undefined>;
          return next;
        }
      });
    };
  }, [columnMeta, histSetColumnVisibility, show, showAllHidden]);

  const onInsertLeft = useMemo(() => {
    return (id: string) => {
      setColumnOrder((order) => {
        const idx = order.indexOf(id);
        if (idx <= 0) return order;
        const next = [...order];
        next.splice(idx, 1);
        next.splice(idx - 1, 0, id);
        return next;
      });
      requestMeasure();
    };
  }, [setColumnOrder, requestMeasure]);

  const onInsertRight = useMemo(() => {
    return (id: string) => {
      setColumnOrder((order) => {
        const idx = order.indexOf(id);
        if (idx < 0 || idx >= order.length - 1) return order;
        const next = [...order];
        next.splice(idx, 1);
        next.splice(idx + 1, 0, id);
        return next;
      });
      requestMeasure();
    };
  }, [setColumnOrder, requestMeasure]);

  return { showAllHidden, onToggleFieldVisibility, onInsertLeft, onInsertRight };
}