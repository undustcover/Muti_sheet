import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import type { RowRecord } from '../types';

export function useViewQuery(params: {
  data: RowRecord[];
  columnMeta: Record<string, any>;
  activeViewId: string;
  show: (msg: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const { data, columnMeta, activeViewId, show } = params;

  const [viewQueryMap, setViewQueryMap] = useState<Record<string, string>>({});
  const activeQuery = viewQueryMap[activeViewId] ?? '';

  const applyQuery = (q: string) => {
    setViewQueryMap((prev) => ({ ...prev, [activeViewId]: q }));
    const count = q ? data.filter((r) => {
      const vals = Object.keys(columnMeta)
        .filter((cid) => cid !== 'id')
        .map((cid) => (r as any)[cid]);
      return vals.some((v) => {
        if (v == null) return false;
        if (typeof v === 'object') {
          const label = (v as any).label ?? (v as any).name ?? '';
          return String(label) === q;
        }
        if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
          const d = dayjs(v);
          const iso = d.isValid() ? d.toISOString() : v;
          const short = d.isValid() ? d.format('YYYY-MM-DD') : v;
          return q === iso || q === short || q === v;
        }
        return String(v) === q;
      });
    }).length : data.length;
    show(q ? `查询匹配 ${count} 行` : '已清空查询', 'success');
  };

  const [queryFocusTick, setQueryFocusTick] = useState(0);
  const [queryOpen, setQueryOpen] = useState(false);
  const openQuery = () => { setQueryOpen(true); setQueryFocusTick((t) => t + 1); };
  const closeQuery = () => setQueryOpen(false);

  useEffect(() => {
    // keep focus tick advancing when open toggles, no-op here; consumers handle input focus
  }, [queryOpen]);

  return {
    activeQuery,
    applyQuery,
    queryFocusTick,
    queryOpen,
    openQuery,
    closeQuery,
  } as const;
}