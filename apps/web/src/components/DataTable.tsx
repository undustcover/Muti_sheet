import { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { KeyboardEvent } from 'react';
import type React from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, SortingState, VisibilityState, OnChangeFn } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import HeaderMenu from './HeaderMenu';
import { isFirstVisibleField } from '../utils/table';
import CellEditor from './editors/CellEditor';
import type { RowRecord, SelectOption } from '../types';

type ColumnMeta = Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; }> & Record<string, any>;

type Props = {
  rows: RowRecord[];
  columnMeta: ColumnMeta;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
  setColumnMeta: (updater: ColumnMeta | ((prev: ColumnMeta) => ColumnMeta)) => void;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  freezeCount: number;
  onFreezeTo: (n: number) => void;
  colWidth: number;
  colWidths: Record<string, number>;
  setColWidths: (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  defaultSelectOptions?: SelectOption[];
  getCellBg: (row: RowRecord, columnId: string) => string | undefined;
  selectedCell: { rowId: string | null; columnId: string | null };
  editingCell: { rowId: string | null; columnId: string | null };
  setSelectedCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  setEditingCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  onEditField: (id: string) => void;
  onHideField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onInsertLeft: (id: string) => void;
  onInsertRight: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onFillColorColumn: (id: string, color: string) => void;
  onCreateField: () => void;
};

export type DataTableHandle = { measure: () => void };

const DataTable = forwardRef<DataTableHandle, Props>(({ 
  rows,
  columnMeta,
  columnOrder,
  columnVisibility,
  sorting,
  setSorting,
  setColumnVisibility,
  setColumnOrder,
  setData,
  setColumnMeta,
  rowHeight,
  freezeCount,
  onFreezeTo,
  colWidth,
  colWidths,
  setColWidths,
  defaultSelectOptions,
  getCellBg,
  selectedCell,
  editingCell,
  setSelectedCell,
  setEditingCell,
  onEditField,
  onHideField,
  onDeleteField,
  onInsertLeft,
  onInsertRight,
  onDuplicateField,
  onFillColorColumn,
  onCreateField,
}, ref) => {
  const columns = useMemo<ColumnDef<RowRecord, any>[]>(() => {
    const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
    const makeDef = (id: string): ColumnDef<RowRecord, any> | null => {
      const meta = columnMeta[id];
      if (!meta || columnVisibility[id] === false) return null;
      const editorType = normalizeType(meta.type);
      const renderDisplay = (val: any) => {
        if (editorType === 'select') {
          return <span>{val?.label ?? ''}</span>;
        }
        if (editorType === 'multiSelect') {
          return <span>{Array.isArray(val) ? val.map((x: SelectOption) => x.label).join(', ') : ''}</span>;
        }
        if (editorType === 'date') {
          try {
            const d = new Date(val);
            return <span>{isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)}</span>;
          } catch { return <span />; }
        }
        if (editorType === 'user') {
          return <span>{val?.name ?? ''}</span>;
        }
        return <span>{val ?? ''}</span>;
      };
      return {
        id,
        header: () => meta.name,
        accessorKey: id,
        cell: ({ row, getValue }) => {
          const isSelected = selectedCell.rowId === row.original.id && selectedCell.columnId === id;
          const val = getValue();
          if (!isSelected || !(editingCell.rowId === row.original.id && editingCell.columnId === id)) {
            return renderDisplay(val);
          }
          return (
            <CellEditor
              type={editorType as any}
              value={val}
              options={(editorType === 'select' || editorType === 'multiSelect') ? (columnMeta[id]?.options ?? defaultSelectOptions ?? []) : undefined}
              onChange={(v) => {
                (row as any)._valuesCache = undefined;
                setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, [id]: v } : r)));
              }}
            />
          );
        },
      } as ColumnDef<RowRecord, any>;
    };
    return columnOrder.map((id) => makeDef(id)).filter(Boolean) as ColumnDef<RowRecord, any>[];
  }, [columnMeta, columnOrder, columnVisibility, setData, selectedCell, editingCell, defaultSelectOptions]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement | null>(null);
  // 绑定到 window 滚动，让页面滚动控制数据表垂直滚动
  const rowVirtualizer = useWindowVirtualizer({
    count: table.getRowModel().rows.length,
    estimateSize: () => ({ low: 28, medium: 40, high: 56, xhigh: 72 }[rowHeight]),
    overscan: 10,
  });

  // 页面尺寸变化时，触发虚拟列表重新测量，保证滚动条与内容高度/宽度自适应
  useEffect(() => {
    const onResize = () => { try { rowVirtualizer.measure(); } catch {} };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    try { ro.observe(document.documentElement); } catch {}
    return () => {
      window.removeEventListener('resize', onResize);
      try { ro.disconnect(); } catch {}
    };
  }, [rowVirtualizer]);

  useImperativeHandle(ref, () => ({
    measure: () => { try { rowVirtualizer.measure(); } catch {} },
  }), [rowVirtualizer]);

  // 行号列宽与每列宽度（可拖拽调整）
const [indexColWidth, setIndexColWidth] = useState<number>(26);
  const getColWidth = (cid: string) => (colWidths[cid] ?? colWidth);
  // 统一使用来自 props 的顺序与可见性，避免错位
  const headerIds = useMemo(() => (
    columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false)
  ), [columnOrder, columnMeta, columnVisibility]);
  const totalWidth = useMemo(() => (
    indexColWidth + headerIds.reduce((sum, cid) => sum + getColWidth(cid), 0) + colWidth
  ), [indexColWidth, headerIds, colWidths, colWidth]);
  const templateColumns = useMemo(() => (
    `${indexColWidth}px ` + headerIds.map((cid) => `${getColWidth(cid)}px`).join(' ') + ` ${colWidth}px`
  ), [indexColWidth, headerIds, colWidths, colWidth]);
  const computeStickyLeft = (idx: number) => {
    // idx 为可见列在表头中的索引（不含行号列）
    // 采用纯列宽累加；边框在 border-box 内，不再额外计算，避免每列+1px的累计误差
    let left = indexColWidth;
    for (let i = 0; i < idx; i++) {
      left += getColWidth(headerIds[i]);
    }
    return left;
  };
  // 新增字段：自动加入列顺序并设为可见
  useEffect(() => {
    const idsInMeta = Object.keys(columnMeta || {});
    const setKnown = new Set(columnOrder);
    const toAdd = idsInMeta.filter((id) => !setKnown.has(id));
    if (toAdd.length > 0) {
      setColumnOrder((prev) => [...prev, ...toAdd]);
    }
    // 默认可见
    if (toAdd.length > 0) {
      const nextVis = { ...columnVisibility } as any;
      let changed = false;
      toAdd.forEach((id) => {
        if (nextVis[id] === undefined) { nextVis[id] = true; changed = true; }
      });
      if (changed) { try { setColumnVisibility(nextVis); } catch {} }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnMeta]);
  // 列宽改为受控，由 App 负责持久化到视图配置

  // 列宽拖拽逻辑
  const startResize = (cid: string, startX: number) => {
    const initial = getColWidth(cid);
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const next = Math.max(60, initial + delta);
      setColWidths((prev) => ({ ...prev, [cid]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp, { once: true });
  };
  // 拖拽手柄悬停时高亮分隔线
  const [hoverResizeCid, setHoverResizeCid] = useState<string | null>(null);
  const [headerSelectedCid, setHeaderSelectedCid] = useState<string | null>(null);

  const moveSelection = (dRow: number, dCol: number) => {
    const rowsModel = table.getRowModel().rows;
    const cols = columns;
    const currRowIdx = Math.max(0, rowsModel.findIndex((r) => r.original.id === selectedCell.rowId));
    const currColIdx = Math.max(0, cols.findIndex((c: any) => c.id === selectedCell.columnId));
    const nextRowIdx = Math.min(Math.max(currRowIdx + dRow, 0), rowsModel.length - 1);
    const nextColIdx = Math.min(Math.max(currColIdx + dCol, 0), cols.length - 1);
    const nextRowId = rowsModel[nextRowIdx]?.original.id ?? null;
    const nextColId = (cols[nextColIdx] as any)?.id ?? null;
    setSelectedCell({ rowId: nextRowId, columnId: nextColId });
    setEditingCell({ rowId: null, columnId: null });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editingCell.rowId && editingCell.columnId) return;
    if (!selectedCell.rowId || !selectedCell.columnId) return;
    // 复制：Ctrl+C 导出为 TSV（仅文本/数字/日期列，其它为空）
    if (e.ctrlKey && String(e.key).toLowerCase() === 'c') {
      e.preventDefault();
      // 若存在选区，直接在此处生成 TSV 并写入剪贴板（更稳健）
      if (selectionRange.start && selectionRange.end) {
        try {
          const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
          const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
          const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
          const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
          const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
          const rowsModel = table.getRowModel().rows;
          const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
          const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
          const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
          const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
          const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
          const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row) => (
            selectedColIds.map((cid) => {
              if (isNumCol(cid)) {
                const n = (row.original as any)[cid];
                return (typeof n === 'number') ? String(n) : '';
              }
              if (isTextCol(cid)) {
                return toText((row.original as any)[cid]);
              }
              if (isDateCol(cid)) {
                const d = (row.original as any)[cid];
                try {
                  const dt = d ? new Date(d) : null;
                  return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
                } catch { return ''; }
              }
              return '';
            }).join('\t')
          )).join('\n');
          const copyViaClipboard = async (text: string) => {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              await navigator.clipboard.writeText(text);
              return true;
            }
            try {
              const ta = document.createElement('textarea');
              ta.value = text;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              ta.style.pointerEvents = 'none';
              document.body.appendChild(ta);
              ta.focus();
              ta.select();
              const ok = document.execCommand('copy');
              document.body.removeChild(ta);
              return ok;
            } catch { return false; }
          };
          void copyViaClipboard(rowsTsv);
          const countRows = (r2 - r1 + 1);
          const countCols = selectedColIds.length;
          setCopyToast({ show: true, count: countRows * countCols });
          window.setTimeout(() => { setCopyToast((prev: any) => (prev?.show ? { show: false, count: prev.count } : prev)); }, 1500);
        } catch {}
        return;
      }
      try {
        const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
        const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
        const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
        const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
        const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
        const rowsModel = table.getRowModel().rows;
        const r1 = 0;
        const r2 = rowsModel.length - 1;
        const c1 = 0;
        const c2 = visibleColumnIds.length - 1;
        const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
        const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row) => (
          selectedColIds.map((cid) => {
            if (cid === 'id') {
              const v = (row.original as any)[cid] ?? row.original.id;
              return toText(v);
            }
            if (isNumCol(cid)) {
              const n = (row.original as any)[cid];
              return (typeof n === 'number') ? String(n) : '';
            }
            if (isTextCol(cid)) {
              return toText((row.original as any)[cid]);
            }
            if (isDateCol(cid)) {
              const d = (row.original as any)[cid];
              try {
                const dt = d ? new Date(d) : null;
                return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
              } catch { return ''; }
            }
            return '';
          }).join('\t')
        )).join('\n');
        const copyViaClipboard = async (text: string) => {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return true;
          }
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            ta.style.pointerEvents = 'none';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
          } catch { return false; }
        };
        void copyViaClipboard(rowsTsv);
      } catch {}
      return;
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(0, 1); }
    else if (e.key === 'Enter') { e.preventDefault(); setEditingCell({ ...selectedCell }); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;
      if (isShift) moveSelection(0, -1); else moveSelection(0, 1);
    }
  };

  const parseClipboardText = (text: string): string[][] => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.length > 0);
    // 优先按制表符分割；如果不存在制表符，退化为逗号分割
    const hasTab = lines.some((l) => l.includes('\t'));
    return lines.map((l) => (hasTab ? l.split('\t') : l.split(',')));
  };
  const parseNumber = (s: string): number | null => {
    if (!s) return null;
    const t = s.trim().replace(/,/g, '');
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) {
      const n = Number(t);
      return isNaN(n) ? null : n;
    }
    return null;
  };
  const parseDate = (s: string): string | null => {
    if (!s) return null;
    const t = s.trim();
    // 允许常见日期/日期时间格式，统一存储为 ISO 字符串
    const dt = new Date(t);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString();
    }
    return null;
  };
  const parseTime = (s: string): string | null => {
    if (!s) return null;
    const t = s.trim();
    // 匹配 HH:mm 或 HH:mm:ss，可选毫秒
    const m = t.match(/^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d)(\.\d{1,3})?)?$/);
    if (!m) return null;
    // 标准化为 HH:mm:ss
    const hh = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const ss = (m[3] ?? '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };
  // 首行粘贴表头识别弹窗状态
  const [headerPrompt, setHeaderPrompt] = useState<{ show: boolean; matrix: string[][] | null; anchorRowIndex: number; anchorColIndex: number }>(
    { show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }
  );
  // 复制提示 toast
  const [copyToast, setCopyToast] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });

  const applyPaste = (matrix: string[][], anchorRowIndex: number, anchorColIndex: number, useHeader: boolean) => {
    let pasteRows = matrix;
    const pasteCols = Math.max(...pasteRows.map((r) => r.length));
    const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
    const availableToRight = Math.max(0, visibleColumnIds.length - Math.max(0, anchorColIndex));
    const needNewCols = Math.max(0, pasteCols - availableToRight);
    const newColIds: string[] = [];

    // 如果识别为表头，直接覆盖现有可见列的列名（不做匹配），并从数据中移除首行
    if (useHeader && pasteRows.length > 0) {
      const headerValues = pasteRows[0];
      const overrideCount = Math.min(pasteCols, visibleColumnIds.length - Math.max(0, anchorColIndex));
      setColumnMeta((prev) => {
        const next = { ...prev } as any;
        for (let i = 0; i < overrideCount; i++) {
          const cid = visibleColumnIds[anchorColIndex + i];
          next[cid] = { ...(next[cid] || {}), name: headerValues[i] ?? '' };
        }
        return next;
      });
      pasteRows = pasteRows.slice(1);
    }

    if (needNewCols > 0) {
      const startIdx = availableToRight; // 从可用右侧的末尾开始是新增列对应的粘贴列索引
      const createId = (idx: number) => `field-${Date.now()}-${idx}`;
      for (let i = 0; i < needNewCols; i++) {
        const colValues = pasteRows.map((r) => r[startIdx + i] ?? '').filter((v) => v !== '');
        const allNum = colValues.length > 0 && colValues.every((v) => parseNumber(v) !== null);
        const allDate = colValues.length > 0 && colValues.every((v) => parseDate(v) !== null);
        const allTime = colValues.length > 0 && colValues.every((v) => parseTime(v) !== null);
        const cid = createId(i);
        newColIds.push(cid);
        const type = allNum ? 'number' : allDate ? 'date' : allTime ? 'time' : 'text';
        const defaultNameByType = (t: string) => t === 'number' ? `数字${startIdx + i + 1}` : t === 'date' ? `日期${startIdx + i + 1}` : t === 'time' ? `时间${startIdx + i + 1}` : `文本${startIdx + i + 1}`;
        const headerVal = useHeader ? (matrix[0]?.[startIdx + i] ?? '') : '';
        const name = useHeader ? (headerVal || defaultNameByType(type)) : defaultNameByType(type);
        setColumnMeta((prev) => ({ ...prev, [cid]: { name, type } }));
        setColumnOrder((order) => [...order, cid]);
        setColumnVisibility((vis) => ({ ...vis, [cid]: true }));
        // 不在创建新列时为所有行填充默认值，避免时间列被自动填满；
        // 粘贴循环会为目标范围行赋值，其他行保持为空。
      }
    }

    const targetColumnIds = [...visibleColumnIds.slice(anchorColIndex), ...newColIds].slice(0, Math.max(...pasteRows.map((r) => r.length)));
    setData((prev) => {
      const next = [...prev];
      for (let r = 0; r < pasteRows.length; r++) {
        const rowVals = pasteRows[r];
        const targetRowIdx = anchorRowIndex + r;
        if (targetRowIdx >= next.length) {
          next.push({ id: `rec-${next.length + 1}`, text: String(next.length + 1), number: 0, date: new Date().toISOString(), select: null, multiSelect: [], relation: null, user: null } as any);
        }
        const rowObj = { ...next[targetRowIdx] } as any;
        for (let c = 0; c < targetColumnIds.length; c++) {
          const cid = targetColumnIds[c];
          const meta = columnMeta[cid] ?? ({} as any);
          const val = rowVals[c] ?? '';
          if (meta.type === 'number') {
            const n = parseNumber(val);
            if (n !== null) rowObj[cid] = n;
          } else if (meta.type === 'text') {
            rowObj[cid] = val;
          } else if (meta.type === 'date') {
            const d = parseDate(val);
            if (d !== null) rowObj[cid] = d;
          } else if (meta.type === 'time') {
            const t = parseTime(val);
            if (t !== null) rowObj[cid] = t;
          } else {
            // 其它类型跳过
          }
        }
        next[targetRowIdx] = rowObj;
      }
      return next;
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!e.clipboardData) return;
    e.preventDefault();
    const raw = e.clipboardData.getData('text/plain');
    if (!raw) return;
    const matrix = parseClipboardText(raw);
    if (matrix.length === 0) return;
    const firstRowId = table.getRowModel().rows[0]?.original.id ?? null;
    const anchorRowIndexRaw = Math.max(0, table.getRowModel().rows.findIndex((r) => r.original.id === selectedCell.rowId));
    const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
    const anchorColIndexRaw = Math.max(0, visibleColumnIds.findIndex((cid) => cid === selectedCell.columnId));
    const hasSelection = !!(selectionRange.start && selectionRange.end);
    const anchorRowIndex = hasSelection ? Math.min(selectionRange.start!.row, selectionRange.end!.row) : anchorRowIndexRaw;
    const anchorColIndex = hasSelection ? Math.min(selectionRange.start!.col, selectionRange.end!.col) : anchorColIndexRaw;
    const atFirstRow = anchorRowIndex === 0 || !selectedCell.rowId || (selectedCell.rowId === firstRowId);
    if (atFirstRow) {
      setHeaderPrompt({ show: true, matrix, anchorRowIndex, anchorColIndex });
    } else {
      applyPaste(matrix, anchorRowIndex, anchorColIndex, false);
    }
  };

  

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: { row: number; col: number } | null; end: { row: number; col: number } | null}>({ start: null, end: null });
  const isInRange = (rowIdx: number, colIdx: number): boolean => {
    if (!selectionRange.start || !selectionRange.end) return false;
    const r1 = Math.min(selectionRange.start.row, selectionRange.end.row);
    const r2 = Math.max(selectionRange.start.row, selectionRange.end.row);
    const c1 = Math.min(selectionRange.start.col, selectionRange.end.col);
    const c2 = Math.max(selectionRange.start.col, selectionRange.end.col);
    return rowIdx >= r1 && rowIdx <= r2 && colIdx >= c1 && colIdx <= c2;
  };

  // 全局 copy：当存在选区时，复制选中单元格，并展示数量提示
  useEffect(() => {
    const onCopy = (ev: any) => {
      if (!(selectionRange.start && selectionRange.end)) return;
      try {
        const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
        const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
        const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
        const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
        const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
        const rowsModel = table.getRowModel().rows;
        const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
        const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
        const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
        const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
        const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
        const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row) => (
          selectedColIds.map((cid) => {
            if (cid === 'id') {
              const v = (row.original as any)[cid] ?? row.original.id;
              return toText(v);
            }
            if (isNumCol(cid)) {
              const n = (row.original as any)[cid];
              return (typeof n === 'number') ? String(n) : '';
            }
            if (isTextCol(cid)) {
              return toText((row.original as any)[cid]);
            }
            if (isDateCol(cid)) {
              const d = (row.original as any)[cid];
              try {
                const dt = d ? new Date(d) : null;
                return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
              } catch { return ''; }
            }
            return '';
          }).join('\t')
        )).join('\n');
        ev.preventDefault();
        ev.clipboardData?.setData('text/plain', rowsTsv);
        const countRows = (r2 - r1 + 1);
        const countCols = selectedColIds.length;
        setCopyToast({ show: true, count: countRows * countCols });
        window.setTimeout(() => { setCopyToast((prev: any) => (prev?.show ? { show: false, count: prev.count } : prev)); }, 1500);
      } catch {}
    };
    window.addEventListener('copy', onCopy);
    return () => { window.removeEventListener('copy', onCopy); };
  }, [selectionRange, columnOrder, columnVisibility, table, columnMeta]);

  return (
    <div data-app-ready="1">
      <div
        ref={parentRef}
        className="sheet-grid"
        style={{
          height: 'auto',
          position: 'relative',
          border: 'none',
          marginTop: 0
        }}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        onMouseDown={(e) => {
          const el = e.target as HTMLElement;
          const isHeaderCell = !!el.closest('.sheet-header-cell');
          const isDataCell = !!el.closest('.sheet-cell');
          if (!isHeaderCell && !isDataCell) {
            setHeaderSelectedCid(null);
            setSelectionRange({ start: null, end: null });
          }
        }}
        onMouseUp={() => { setIsDragging(false); }}
      >
        {/* 表头放入与数据同一滚动容器，并置顶粘性，避免双滚动条不同步 */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          display: 'grid',
          gridTemplateColumns: templateColumns,
          gap: 0,
          fontWeight: 600,
          borderBottom: '1px solid #ddd',
          paddingBottom: 2,
          zIndex: 10,
          // 设定最小宽度以在页面上出现底部横向滑块
          minWidth: `${totalWidth}px`
        }}>
          {/* 行号列表头空白占位（隐藏标题，仅保证栅格对齐）*/}
          <div
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 12,
              background: '#f7faff',
              width: `${indexColWidth}px`,
              color: '#999',
              cursor: 'default',
              userSelect: 'none',
              borderRight: '1px solid #eee',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
          {(function() {
            const flatHeaders = table.getFlatHeaders();
            return headerIds.map((cid) => {
              const header = flatHeaders.find((h) => h.column.id === cid);
              const hIdx = headerIds.indexOf(cid);
              const isFrozen = hIdx >= 0 && hIdx < freezeCount;
              const isSelected = headerSelectedCid === cid;
              return (
                <div
                  key={header?.id ?? cid}
                  className="sheet-header-cell"
                  draggable={isSelected}
                  onClick={() => setHeaderSelectedCid(cid)}
                  onDragStart={(e) => {
                    if (!isSelected) return;
                    setDragSourceId(cid);
                    try { e.dataTransfer.setData('text/plain', cid); } catch {}
                  }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const srcId = headerSelectedCid || dragSourceId || e.dataTransfer.getData('text/plain');
                    const dstId = cid;
                    if (!srcId || !dstId || srcId === dstId || srcId === 'id' || dstId === 'id') return;
                    setColumnOrder((prev) => {
                      const arr = prev.filter((x) => x !== srcId);
                      const dstIdx = arr.indexOf(dstId);
                      const insertIdx = dstIdx < 0 ? arr.length : dstIdx;
                      const next = [...arr.slice(0, insertIdx), srcId, ...arr.slice(insertIdx)];
                      return next;
                    });
                    setDragSourceId(null);
                  }}
                  style={{
                    cursor: isSelected ? 'grab' : 'default',
                    position: isFrozen ? 'sticky' : 'relative',
                    left: isFrozen ? `${computeStickyLeft(hIdx)}px` : undefined,
                    zIndex: isFrozen ? 11 : 1,
                    background: isSelected ? 'rgba(31, 111, 235, 0.15)' : (isFrozen ? '#f7faff' : undefined),
                    width: `${getColWidth(cid)}px`,
                    borderRight: `1px solid ${hoverResizeCid === cid ? '#1f6feb' : '#eee'}`,
                    boxSizing: 'border-box',
                    outline: undefined,
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px', boxSizing: 'border-box' }}>
                    <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {header ? flexRender(header.column.columnDef.header, header.getContext()) : (columnMeta[cid]?.name ?? cid)}
                      {(() => {
                        const sorted = header ? (header.column.getIsSorted() as 'asc' | 'desc' | false) : (sorting?.find((s) => s && s.id === cid) ? ((sorting.find((s) => s && s.id === cid)!.desc ? 'desc' : 'asc') as 'asc' | 'desc') : false);
                        return ({ asc: ' ▲', desc: ' ▼' }[sorted as 'asc' | 'desc'] ?? '');
                      })()}
                    </span>
                    <HeaderMenu
                      columnId={cid}
                      index={hIdx}
                      disabled={false}
                      disableHide={cid === 'id'}
                      disableDelete={cid === 'id' || isFirstVisibleField(cid, columnOrder, columnVisibility)}
                      onFreezeTo={(n) => onFreezeTo(n)}
                      onSortAsc={(id) => setSorting([{ id, desc: false }])}
                      onSortDesc={(id) => setSorting([{ id, desc: true }])}
                      onEditField={onEditField}
                      onHideField={onHideField}
                      onDeleteField={onDeleteField}
                      onInsertLeft={onInsertLeft}
                      onInsertRight={onInsertRight}
                      onDuplicateField={onDuplicateField}
                      onFillColorColumn={onFillColorColumn}
                    />
                  </div>
                  {/* 列宽拖拽手柄 */}
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); startResize(cid, e.clientX); }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => setHoverResizeCid(cid)}
                    onMouseLeave={() => setHoverResizeCid((prev) => (prev === cid ? null : prev))}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, cursor: 'col-resize', background: hoverResizeCid === cid ? '#1f6feb' : 'transparent', zIndex: 12 }}
                    title="拖拽调整列宽"
                  />
                </div>
              );
            });
          })()}
          {/* 新建字段按钮 - 最右侧 */}
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            <span role="button" title="新建字段" onClick={onCreateField} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px' }}>+</span>
          </div>
        </div>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', minWidth: `${totalWidth}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index]!;
            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                className="sheet-grid-row"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`, display: 'grid', gridTemplateColumns: templateColumns, minWidth: `${totalWidth}px`, borderBottom: 'none' }}
              >
                {/* 行号列，灰色文本、不可交互 */}
                <div
                  className="sheet-cell frozen"
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 4,
                    background: '#fff',
                    color: '#999',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    width: `${indexColWidth}px`,
                    borderRight: '1px solid #eee',
                    boxSizing: 'border-box'
                  }}
                >{virtualRow.index + 1}</div>
                {(function() {
                  const cellMap = new Map<string, any>();
                  row.getVisibleCells()
                    .filter((cell) => cell && cell.column && (cell.column as any).id)
                    .forEach((cell) => { cellMap.set((cell.column as any).id as string, cell); });
                  return headerIds.map((colId, cIdx) => {
                    const cell = cellMap.get(colId);
                    if (!cell) return null;
                    const rowId = (row.original as any)?.id ?? row.id;
                    return (
                      <div
                        key={(cell as any).id ?? `${row.id}-${cIdx}`}
                        className={`sheet-cell${cIdx < freezeCount ? ' frozen' : ''}${cIdx === freezeCount - 1 ? ' frozen-shadow' : ''}${(selectedCell.rowId === rowId && selectedCell.columnId === colId) ? ' is-selected' : ''}${isInRange(virtualRow.index, cIdx) ? ' is-range' : ''}`}
                        style={{
                          position: (cIdx < freezeCount) ? 'sticky' : 'static',
                          left: (cIdx < freezeCount) ? `${computeStickyLeft(cIdx)}px` : undefined,
                          zIndex: (cIdx < freezeCount) ? 3 : 1,
                          background: (headerSelectedCid === colId)
                            ? 'rgba(31, 111, 235, 0.10)'
                            : ((cIdx < freezeCount) ? '#fff' : getCellBg(row.original, colId)),
                          borderRight: `1px solid ${hoverResizeCid === colId ? '#1f6feb' : '#eee'}`,
                          borderBottom: '1px solid #eee',
                          width: `${getColWidth(colId)}px`,
                          boxSizing: 'border-box',
                          outline: undefined
                        }}
                        onClick={() => {
                          const isEditingThis = editingCell.rowId === rowId && editingCell.columnId === colId;
                          if (isEditingThis) return;
                          setSelectedCell({ rowId: rowId, columnId: colId });
                          setEditingCell({ rowId: null, columnId: null });
                          setHeaderSelectedCid(null);
                          setSelectionRange({ start: null, end: null });
                          parentRef.current?.focus();
                        }}
                        onDoubleClickCapture={() => {
                          setSelectedCell({ rowId: rowId, columnId: colId });
                          setEditingCell({ rowId: rowId, columnId: colId });
                        }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          setIsDragging(true);
                          setSelectionRange({ start: { row: virtualRow.index, col: cIdx }, end: { row: virtualRow.index, col: cIdx } });
                          setSelectedCell({ rowId: rowId, columnId: colId });
                          setEditingCell({ rowId: null, columnId: null });
                        }}
                        onMouseEnter={() => {
                          if (!isDragging) return;
                          setSelectionRange((prev) => ({ start: prev.start, end: { row: virtualRow.index, col: cIdx } }));
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })}
        </div>
      </div>
      {copyToast.show && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.25)', fontSize: 13 }}>
          已复制 {copyToast.count} 个单元格
        </div>
      )}
      {headerPrompt.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, minWidth: 360, maxWidth: 520, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontSize: 16, fontWeight: 600 }}>粘贴选项</div>
            <div style={{ padding: '20px', fontSize: 14, color: '#333' }}>是否将首行识别为表头</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 20px' }}>
              <button onClick={() => { if (headerPrompt.matrix) applyPaste(headerPrompt.matrix, headerPrompt.anchorRowIndex, headerPrompt.anchorColIndex, false); setHeaderPrompt({ show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>直接粘贴</button>
              <button onClick={() => { if (headerPrompt.matrix) applyPaste(headerPrompt.matrix, headerPrompt.anchorRowIndex, headerPrompt.anchorColIndex, true); setHeaderPrompt({ show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1f6feb', color: '#fff', cursor: 'pointer' }}>识别为表头</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DataTable;