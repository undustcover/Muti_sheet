import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ColumnItem, RowRecord } from '../types';

type AggType = 'none' | 'total' | 'empty' | 'filled' | 'unique' | 'empty_pct' | 'filled_pct' | 'unique_pct';

type Props = {
  columns: ColumnItem[];
  rows: RowRecord[];
  columnVisibility: Record<string, boolean | undefined>;
  statsAggByField: Record<string, AggType | undefined>;
  onChangeAgg: (fieldId: string, agg: AggType) => void;
  columnOrder: string[];
  colWidths: Record<string, number | undefined>;
  defaultColWidth: number;
  freezeCount: number;
};

const aggOptions: { value: AggType; label: string }[] = [
  { value: 'none', label: '不展示' },
  { value: 'total', label: '记录总数' },
  { value: 'empty', label: '未填写' },
  { value: 'filled', label: '已填写' },
  { value: 'unique', label: '唯一值' },
  { value: 'empty_pct', label: '未填写占比' },
  { value: 'filled_pct', label: '已填写占比' },
  { value: 'unique_pct', label: '唯一值占比' },
];

const isEmpty = (v: any): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    // 选择/用户等对象：无 label/name 视为空
    const label = (v as any).label ?? (v as any).name ?? '';
    return String(label).trim() === '';
  }
  return false;
};

const canon = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) {
    // 多选：按 label/name 排序后拼接
    const parts = v.map((x) => (x?.label ?? x?.name ?? String(x))).filter(Boolean).map(String).sort();
    return parts.join(',');
  }
  if (typeof v === 'object') {
    const label = (v as any).label ?? (v as any).name ?? '';
    return String(label).trim();
  }
  try { return JSON.stringify(v); } catch { return String(v); }
};

const BottomStatsBar: React.FC<Props> = ({ columns, rows, columnVisibility, statsAggByField, onChangeAgg, columnOrder, colWidths, defaultColWidth, freezeCount }) => {
  const colById = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c])), [columns]);
  const orderedVisibleIds = useMemo(() => columnOrder.filter((id) => id !== 'id' && columnVisibility[id] !== false && !!colById[id]), [columnOrder, columnVisibility, colById]);
  const orderedVisibleColumns = useMemo(() => orderedVisibleIds.map((id) => colById[id] as ColumnItem), [orderedVisibleIds, colById]);
  const indexColWidth = 26; // 与DataTable保持一致
  const totalWidth = useMemo(() => indexColWidth + orderedVisibleIds.reduce((sum, id) => sum + (colWidths[id] ?? defaultColWidth), 0), [orderedVisibleIds, colWidths, defaultColWidth]);
  const [openCid, setOpenCid] = useState<string | null>(null);
  const [hoverCid, setHoverCid] = useState<string | null>(null);
  const anchorRefMap = useRef<Record<string, HTMLDivElement | null>>({});
  const [anchorRect, setAnchorRect] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // 点击非菜单区域关闭
      if (openCid) {
        const el = anchorRefMap.current[openCid];
        if (el && !el.contains(e.target as Node)) {
          setOpenCid(null);
          setAnchorRect(null);
        }
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openCid]);

  const computeValue = (cid: string, type: AggType): string => {
    const total = rows.length;
    if (type === 'total') return `${total}`;
    const vals = rows.map((r) => (r as any)[cid]);
    const empties = vals.filter((v) => isEmpty(v)).length;
    const filled = total - empties;
    if (type === 'empty') return `${empties}`;
    if (type === 'filled') return `${filled}`;
    if (type === 'unique') {
      const set = new Set(vals.filter((v) => !isEmpty(v)).map(canon));
      return `${set.size}`;
    }
    if (type === 'empty_pct') return total > 0 ? `${((empties / total) * 100).toFixed(2)}%` : '0%';
    if (type === 'filled_pct') return total > 0 ? `${((filled / total) * 100).toFixed(2)}%` : '0%';
    if (type === 'unique_pct') {
      const set = new Set(vals.filter((v) => !isEmpty(v)).map(canon));
      return total > 0 ? `${((set.size / total) * 100).toFixed(2)}%` : '0%';
    }
    return '';
  };

  return (
    <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eee', padding: '2px 0', display: 'flex', gap: 0, overflowX: 'hidden', zIndex: 50, minWidth: `${totalWidth}px`, paddingLeft: `${indexColWidth}px`, boxSizing: 'border-box' }}>
      {orderedVisibleColumns.map((c, idx) => {
        const currentAgg = statsAggByField[c.id] ?? 'none';
        const val = currentAgg !== 'none' ? computeValue(c.id, currentAgg) : '';
        const label = currentAgg !== 'none' ? (aggOptions.find((o) => o.value === currentAgg)?.label ?? '') : '';
        const width = (colWidths[c.id] ?? defaultColWidth);
        const isFrozen = idx < freezeCount;
        // 底部栏容器已通过 paddingLeft = indexColWidth 预留了行号列宽度，
        // 因此冻结列的 stickyLeft 不应再重复加上 indexColWidth，以避免右移偏差。
        const stickyLeft = isFrozen ? orderedVisibleIds.slice(0, idx).reduce((sum, id) => sum + (colWidths[id] ?? defaultColWidth), 0) : undefined;
        
        return (
          <div key={c.id} style={{ position: isFrozen ? 'sticky' as const : 'relative', width, left: isFrozen ? stickyLeft : undefined, zIndex: isFrozen ? 3 : 1, boxSizing: 'border-box' }}>
            <div
              ref={(el) => { anchorRefMap.current[c.id] = el; }}
              onClick={() => {
                setOpenCid((prev) => (prev === c.id ? null : c.id));
                const el = anchorRefMap.current[c.id];
                if (el) {
                  const rect = el.getBoundingClientRect();
                  setAnchorRect({ left: rect.left, top: rect.top });
                }
              }}
              onMouseEnter={() => setHoverCid(c.id)}
              onMouseLeave={() => setHoverCid((prev) => (prev === c.id ? null : prev))}
              style={{
                padding: '2px 8px',
                height: 22,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#8a8a8a',
                background: hoverCid === c.id ? '#f7f7f7' : 'transparent'
              }}
            >
              {currentAgg !== 'none' ? (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#8a8a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {val} {label}
                </span>
              ) : null}
            </div>
            {openCid === c.id && anchorRect && createPortal(
              <div style={{ 
                position: 'fixed', 
                top: anchorRect.top, 
                left: anchorRect.left, 
                transform: 'translateY(-100%)',
                background: '#fff', 
                border: '1px solid #ddd', 
                borderRadius: 6, 
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)', 
                zIndex: 2000,
                minWidth: 140
              }}>
                {aggOptions.map((opt) => (
                  <div 
                    key={opt.value} 
                    style={{ 
                      padding: '8px 12px', 
                      cursor: 'pointer', 
                      fontWeight: opt.value === currentAgg ? 700 : 400,
                      borderBottom: opt.value !== aggOptions[aggOptions.length - 1].value ? '1px solid #f0f0f0' : 'none'
                    }}
                    onClick={() => { onChangeAgg(c.id, opt.value); setOpenCid(null); setAnchorRect(null); }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>,
              document.body
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BottomStatsBar;