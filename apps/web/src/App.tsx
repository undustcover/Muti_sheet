import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import './App.css';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import ProtectDrawer from './components/ProtectDrawer';
import Toolbar from './components/Toolbar';
import HeaderMenu from './components/HeaderMenu';
import FieldDrawer from './components/FieldDrawer';
import { useToast } from './components/Toast';
import ConditionBuilder from './components/ConditionBuilder';
import ColorRulesDrawer from './components/ColorRulesDrawer';
import { useColorRulesStore } from './stores/colorRules';
import type { ConditionGroup } from './stores/colorRules';
import { matchesGroup, applyColorBackground } from './utils/logic';

// Types for MVP fields
type User = { id: string; name: string };
type SelectOption = { id: string; label: string };

export type RowRecord = {
  id: string;
  text: string;
  number: number;
  date: string; // ISO string
  select: SelectOption | null;
  multiSelect: SelectOption[];
  relation: string | null; // related record id
  user: User | null;
};

type ColumnItem = { id: string; name: string; type: string };

type View = { id: string; name: string; protect: 'public' | 'locked' | 'personal' };

const initialOptions: SelectOption[] = [
  { id: 'opt-1', label: '需求' },
  { id: 'opt-2', label: '进行中' },
  { id: 'opt-3', label: '完成' },
];

const mockUsers: User[] = [
  { id: 'u-1', name: 'Alice' },
  { id: 'u-2', name: 'Bob' },
  { id: 'u-3', name: 'Carol' },
];

function generateMockRows(count = 100): RowRecord[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `rec-${i + 1}`,
    text: `任务 ${i + 1}`,
    number: Math.round(Math.random() * 1000),
    date: dayjs().subtract(i, 'day').toISOString(),
    select: initialOptions[(i + 1) % initialOptions.length],
    multiSelect: [initialOptions[i % initialOptions.length]],
    relation: i % 5 === 0 ? `rec-${i}` : null,
    user: mockUsers[i % mockUsers.length],
  }));
}

function CellEditor({ value, onChange, type }: {
  value: any;
  onChange: (v: any) => void;
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'relation' | 'user';
}) {
  if (type === 'text') {
    return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (type === 'number') {
    return <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
  }
  if (type === 'date') {
    const v = value ? dayjs(value).format('YYYY-MM-DD') : '';
    return <input type="date" value={v} onChange={(e) => onChange(dayjs(e.target.value).toISOString())} />;
  }
  if (type === 'select') {
    return (
      <select value={value?.id ?? ''} onChange={(e) => onChange(initialOptions.find(o => o.id === e.target.value) ?? null)}>
        <option value="">(空)</option>
        {initialOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (type === 'multiSelect') {
    return (
      <select multiple value={(value ?? []).map((v: SelectOption) => v.id)}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange(selected.map((id) => initialOptions.find(o => o.id === id)!).filter(Boolean));
        }}>
        {initialOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (type === 'relation') {
    return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="关联记录ID" />;
  }
  if (type === 'user') {
    return (
      <select value={value?.id ?? ''} onChange={(e) => onChange(mockUsers.find(u => u.id === e.target.value) ?? null)}>
        <option value="">(空)</option>
        {mockUsers.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    );
  }
  return <span />;
}

export default function App() {
  const { show } = useToast();
  const [activeNav, setActiveNav] = useState<string>('table');

  const [views, setViews] = useState<View[]>([
    { id: 'view-1', name: '视图1', protect: 'public' },
    { id: 'view-2', name: '视图2', protect: 'public' },
  ]);
  const [activeViewId, setActiveViewId] = useState<string>('view-1');
  const [protectOpen, setProtectOpen] = useState(false);

  const [rowHeight, setRowHeight] = useState<'low' | 'medium' | 'high' | 'xhigh'>('medium');

  const [data, setData] = useState<RowRecord[]>(() => generateMockRows(200));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [freezeCount, setFreezeCount] = useState<number>(0);
  const colWidth = 160;
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);


  // Column meta (header names & types)
  const initialColumnMeta: Record<string, { name: string; type: string; description?: string }> = {
    id: { name: 'ID', type: 'text', description: '' },
    text: { name: '文本', type: 'text', description: '' },
    number: { name: '数字', type: 'number', description: '' },
    date: { name: '日期', type: 'date', description: '' },
    select: { name: '选择', type: 'single', description: '' },
    multiSelect: { name: '多选', type: 'multi', description: '' },
    relation: { name: '关联', type: 'text', description: '' },
    user: { name: '用户', type: 'user', description: '' },
  };
  const [columnMeta, setColumnMeta] = useState<Record<string, { name: string; type: string; description?: string }>>(initialColumnMeta);
  const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(initialColumnMeta));
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});

  const columnItems: ColumnItem[] = useMemo(() => (
    columnOrder.filter((id) => !!columnMeta[id]).map((id) => ({ id, name: columnMeta[id].name, type: columnMeta[id].type }))
  ), [columnMeta, columnOrder]);

  // 为逻辑函数提供的列类型映射（统一为 utils/logic 需要的类型名）
  const logicColumnMeta = useMemo(() => {
    const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
    return Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: mapType(m.type) }]));
  }, [columnMeta]);
  const visibleCount = useMemo(() => Object.keys(columnMeta).filter((id) => columnVisibility[id] !== false).length, [columnMeta, columnVisibility]);

  useEffect(() => {
    if (freezeCount > visibleCount) {
      setFreezeCount(Math.max(0, visibleCount));
    }
  }, [freezeCount, visibleCount]);

  const hasHidden = useMemo(() => Object.values(columnVisibility).some((v) => v === false), [columnVisibility]);
  const hiddenToastShownRef = useRef(false);
  const onlyFrozenToastShownRef = useRef(false);
  // 过滤条件（支持条件组）
  const [activeGroup, setActiveGroup] = useState<ConditionGroup | null>(null);
  // 颜色规则读取
  const rules = useColorRulesStore((s) => s.rules);
  // 过滤后的数据
  const filteredData = useMemo(() => (
    !activeGroup ? data : data.filter((r) => matchesGroup(r, activeGroup, logicColumnMeta))
  ), [data, activeGroup, logicColumnMeta]);
  // 单元格背景色（综合规则与列基础色）
  const getCellBg = (row: RowRecord, columnId: string): string | undefined => {
    const { cellBg, rowBg } = applyColorBackground(rules, row, columnId, columnColors, logicColumnMeta);
    return cellBg ?? rowBg;
  };

  useEffect(() => {
     if (hasHidden && !hiddenToastShownRef.current) {
       show('已隐藏部分字段，可在字段菜单或工具栏恢复', 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
       hiddenToastShownRef.current = true;
     } else if (!hasHidden && hiddenToastShownRef.current) {
       hiddenToastShownRef.current = false;
     }
   }, [hasHidden]);
   useEffect(() => {
    const onlyFrozen = visibleCount > 0 && visibleCount <= freezeCount;
    if (onlyFrozen && !onlyFrozenToastShownRef.current) {
      show('仅展示冻结列，已隐藏所有非冻结列', 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
      onlyFrozenToastShownRef.current = true;
    } else if (!onlyFrozen && onlyFrozenToastShownRef.current) {
      onlyFrozenToastShownRef.current = false;
    }
  }, [visibleCount, freezeCount]);
  const columns = useMemo<ColumnDef<RowRecord, any>[]>(() => {
    const makeDef = (id: string): ColumnDef<RowRecord, any> | null => {
      if (!(id in columnMeta)) return null;
      const meta = columnMeta[id];
      if (id === 'id') {
        return { id, header: () => meta.name, accessorKey: 'id', cell: (info) => info.getValue() };
      }
      if (id === 'text') {
        return { id, header: () => meta.name, accessorKey: 'text', cell: ({ row, getValue }) => (
          <CellEditor type="text" value={getValue()} onChange={(v) => {
            row._valuesCache = undefined; row.original.text = v;
            setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, text: v } : r)));
          }} />
        ) };
      }
      if (id === 'number') {
        return { id, header: () => meta.name, accessorKey: 'number', cell: ({ row, getValue }) => (
          <CellEditor type="number" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, number: v } : r)))} />
        ) };
      }
      if (id === 'date') {
        return { id, header: () => meta.name, accessorKey: 'date', cell: ({ row, getValue }) => (
          <CellEditor type="date" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, date: v } : r)))} />
        ) };
      }
      if (id === 'select') {
        return { id, header: () => meta.name, accessorKey: 'select', cell: ({ row, getValue }) => (
          <CellEditor type="select" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, select: v } : r)))} />
        ) };
      }
      if (id === 'multiSelect') {
        return { id, header: () => meta.name, accessorKey: 'multiSelect', cell: ({ row, getValue }) => (
          <CellEditor type="multiSelect" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, multiSelect: v } : r)))} />
        ) };
      }
      if (id === 'relation') {
        return { id, header: () => meta.name, accessorKey: 'relation', cell: ({ row, getValue }) => (
          <CellEditor type="relation" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, relation: v } : r)))} />
        ) };
      }
      if (id === 'user') {
        return { id, header: () => meta.name, accessorKey: 'user', cell: ({ row, getValue }) => (
          <CellEditor type="user" value={getValue()} onChange={(v) => setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, user: v } : r)))} />
        ) };
      }
      return null;
    };
    return columnOrder.map((id) => makeDef(id)).filter(Boolean) as ColumnDef<RowRecord, any>[];
  }, [columnMeta, columnOrder, setData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Virtual rows
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ({ low: 28, medium: 40, high: 56, xhigh: 72 }[rowHeight]),
    overscan: 10,
  });

  // Export
  const handleExport = () => {
    const header = ['text', 'number', 'date', 'select', 'multiSelect', 'relation', 'user'];
    const rows = data.map((r) => [
      r.text,
      r.number,
      dayjs(r.date).format('YYYY-MM-DD'),
      r.select?.label ?? '',
      r.multiSelect.map((m) => m.label).join(','),
      r.relation ?? '',
      r.user?.name ?? '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
  };
  // 新增：导入处理（由 Toolbar 触发，已解析为行数据）
  const onImport = (rows: RowRecord[]) => {
    setData(rows);
    show('已导入 Excel 数据', 'success');
  };

  const onAddRecord = () => {
    setData((prev) => [{
      id: `rec-${prev.length + 1}`,
      text: '', number: 0, date: dayjs().toISOString(), select: null, multiSelect: [], relation: null, user: null,
    }, ...prev]);
  };

  const onColumnsChange = (cols: ColumnItem[]) => {
    setColumnMeta((meta) => {
      const next = { ...meta };
      cols.forEach((c) => {
        if (c.id === 'id' && !(['text','date','number'] as string[]).includes(c.type)) {
          next[c.id] = { name: c.name, type: 'text', description: next[c.id]?.description };
        } else {
          next[c.id] = { name: c.name, type: c.type, description: next[c.id]?.description };
        }
      });
      return next;
    });
    // 保持当前顺序不变
  };

  const onEditField = (id: string) => { setEditingFieldId(id); setFieldDrawerOpen(true); };
  const onHideField = (id: string) => {
    setColumnVisibility((v) => {
      const next = { ...v, [id]: false };
      const nextVisibleCount = Object.keys(columnMeta).filter((cid) => next[cid] !== false).length;
      if (nextVisibleCount === 0) {
        show('至少保留一个可见列', 'warning');
        return v;
      }
      show(`已隐藏字段：${columnMeta[id]?.name ?? id}`, 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
      return next;
    });
  };
  // 新增：切换字段显示/隐藏
  const onToggleFieldVisibility = (id: string) => {
    setColumnVisibility((v) => {
      const isVisible = v[id] !== false;
      if (isVisible) {
        const next = { ...v, [id]: false };
        const nextVisibleCount = Object.keys(columnMeta).filter((cid) => next[cid] !== false).length;
        if (nextVisibleCount === 0) {
          show('至少保留一个可见列', 'warning');
          return v;
        }
        show(`已隐藏字段：${columnMeta[id]?.name ?? id}`, 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
        return next;
      } else {
        const next = { ...v, [id]: true };
        return next;
      }
    });
  };
  const onDeleteField = (id: string) => {
    if (id === 'id') { show('不可删除 ID 字段', 'warning'); return; }
    setColumnMeta((prev) => {
      const next = { ...prev } as Record<string, { name: string; type: string; description?: string }>;
      delete next[id];
      return next;
    });
    setColumnOrder((order) => order.filter((x) => x !== id));
    setColumnVisibility((v) => {
      const { [id]: _, ...rest } = v;
      return rest;
    });
    setSorting((s) => s.filter((x) => x.id !== id));
  };
  const onInsertLeft = (id: string) => {
    setColumnOrder((order) => {
      const idx = order.indexOf(id);
      if (idx <= 0) return order;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(idx - 1, 0, id);
      return next;
    });
  };
  const onInsertRight = (id: string) => {
    setColumnOrder((order) => {
      const idx = order.indexOf(id);
      if (idx < 0 || idx >= order.length - 1) return order;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(idx + 1, 0, id);
      return next;
    });
  };
  const onDuplicateField = (id: string) => { show('当前版本为固定字段集，复制字段暂不支持', 'info'); };
  const onFillColorColumn = (columnId: string, color: string) => {
    setColumnColors((prev) => ({ ...prev, [columnId]: color }));
    show('整列填色已应用', 'success');
  };

  const showAllHidden = () => setColumnVisibility({});

  // Tabs actions
  const addView = () => {
    const n = views.length + 1;
    setViews((prev) => [...prev, { id: `view-${n}`, name: `视图${n}`, protect: 'public' }]);
  };
  const renameView = (id: string, name: string) => setViews((v) => v.map((x) => x.id === id ? { ...x, name } : x));
  const duplicateView = (id: string) => {
    const src = views.find((v) => v.id === id);
    if (!src) return;
    setViews((prev) => [...prev, { ...src, id: `view-${prev.length + 1}`, name: `${src.name} 副本` }]);
  };
  const deleteView = (id: string) => {
    if (id === 'view-1') return; // 保留至少一个视图
    setViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId('view-1');
  };
  const openProtect = (id: string) => {
    setActiveViewId(id);
    setProtectOpen(true);
  };
  const currentProtect = views.find(v => v.id === activeViewId)?.protect ?? 'public';

  const setProtectMode = (m: 'public' | 'locked' | 'personal') => {
    setViews((prev) => prev.map((v) => v.id === activeViewId ? { ...v, protect: m } : v));
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active={activeNav} onNavigate={setActiveNav} />

      <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部：视图标签 */}
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            views={views}
            activeId={activeViewId}
            onSelect={setActiveViewId}
            onAdd={addView}
            onRename={renameView}
            onDuplicate={duplicateView}
            onDelete={deleteView}
            onProtectClick={openProtect}
          />
        </div>

        {/* 工具栏 */}
        {activeNav === 'table' && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <Toolbar
              columns={columnItems}
              onColumnsChange={onColumnsChange}
              rowHeight={rowHeight}
              onRowHeightChange={setRowHeight}
              onFilterOpen={() => setFilterOpen(true)}
              onColorOpen={() => setColorOpen(true)}
              onGroupOpen={() => show('分组占位', 'info')}
              onSortOpen={() => show('排序占位', 'info')}
              onShowAllHidden={showAllHidden}
              onAddRecord={onAddRecord}
              onImport={onImport}
              onExport={handleExport}
              columnVisibility={columnVisibility}
              onToggleFieldVisibility={onToggleFieldVisibility}
            />
          </div>
        )}

        {/* 内容区 */}
        <div style={{ padding: 12, overflow: 'hidden', flex: 1 }}>
          {activeNav === 'table' && (
            <div data-app-ready="1">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, ${colWidth}px)`, gap: 4, fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
                  {table.getFlatHeaders().map((header, idx) => (
                    <div key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: 'pointer', position: idx < freezeCount ? 'sticky' : 'static', left: idx < freezeCount ? `${idx * colWidth}px` : undefined, zIndex: idx < freezeCount ? 5 : 1, background: idx < freezeCount ? '#f7faff' : undefined }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as 'asc' | 'desc'] ?? ''}
                      <HeaderMenu
                        columnId={header.column.id}
                        index={idx}
                        disabled={false}
                        disableHide={header.column.id === 'id'}
                        disableDelete={header.column.id === 'id'}
                        onFreezeTo={(n) => setFreezeCount(n)}
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
                  ))}
                </div>
               {Object.values(columnVisibility).some((v) => v === false) && (
                 <div style={{ padding: '6px 0', fontSize: 12, color: '#666' }}>
                   已隐藏部分字段。<span role="button" style={{ color: '#2563eb', cursor: 'pointer' }} onClick={showAllHidden}>显示已隐藏字段</span>
                   {visibleCount > 0 && visibleCount <= freezeCount && (
                     <div style={{ marginTop: 4 }}>已隐藏所有非冻结列，仅展示冻结列。</div>
                   )}
                 </div>
               )}
              
              <div ref={parentRef} style={{ height: 'calc(100vh - 220px)', overflow: 'auto', position: 'relative', border: '1px solid #eee', marginTop: 8 }}>
                <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = table.getRowModel().rows[virtualRow.index]!;
                    return (
                      <div
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'grid',
                          gridTemplateColumns: `repeat(${columns.length}, ${colWidth}px)`,
                          gap: 4,
                          padding: '6px 0',
                          borderBottom: '1px solid #f3f3f3',
                        }}
                      >
                        {row.getVisibleCells().map((cell, cIdx) => (
                          <div key={cell.id} style={{ paddingRight: 8, position: cIdx < freezeCount ? 'sticky' : 'static', left: cIdx < freezeCount ? `${cIdx * colWidth}px` : undefined, zIndex: cIdx < freezeCount ? 2 : 1, background: cIdx < freezeCount ? '#fff' : getCellBg(row.original, cell.column.id) }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeNav === 'collect' && (
            <div style={{ padding: 24 }}>
              <h3>收集表</h3>
              <p>用于外部收集数据的表单设计区域（占位）。</p>
            </div>
          )}

          {activeNav === 'dashboard' && (
            <div style={{ padding: 24 }}>
              <h3>仪表盘</h3>
              <p>可视化图表与指标卡片布局（占位）。</p>
            </div>
          )}

          {activeNav === 'docs' && (
            <div style={{ padding: 24 }}>
              <h3>在线文档</h3>
              <p>文档编辑与协同（占位）。</p>
            </div>
          )}

          {activeNav === 'files' && (
            <div style={{ padding: 24 }}>
              <h3>文件夹</h3>
              <p>文件管理与预览（占位）。</p>
            </div>
          )}
        </div>
      </div>

      {/* 保护视图抽屉 */}
      <ProtectDrawer
        open={protectOpen}
        onClose={() => setProtectOpen(false)}
        mode={currentProtect}
        onModeChange={(m) => setProtectMode(m)}
      />
      <FieldDrawer
        open={fieldDrawerOpen}
        fieldId={editingFieldId}
        initialName={editingFieldId ? columnMeta[editingFieldId]?.name : ''}
        initialType={editingFieldId ? (columnMeta[editingFieldId]?.type as any) : 'text'}
        initialDescription={editingFieldId ? (columnMeta[editingFieldId]?.description ?? '') : ''}
        disabledTypeEdit={editingFieldId === 'id'}
        onClose={() => { setFieldDrawerOpen(false); setEditingFieldId(null); }}
        onSave={({ id, name, type, description }) => {
          const trimmed = (name || '').trim();
          if (!trimmed) {
            show('字段名称不能为空', 'warning');
            return;
          }
          const duplicate = Object.entries(columnMeta).some(([cid, meta]) => cid !== id && meta.name === trimmed);
          if (duplicate) {
            show('字段名称已存在', 'warning');
            return;
          }
          const prevType = columnMeta[id]?.type;
          setColumnMeta((prev) => {
            const next = { ...prev } as any;
            if (id === 'id' && !(['text','date','number'] as string[]).includes(type)) {
              next[id] = { name: trimmed, type: 'text', description };
            } else {
              next[id] = { name: trimmed, type, description } as any;
            }
            return next;
          });
          if (prevType !== type) {
            if (id === 'select' && type !== 'single') {
              setData((prev) => prev.map((r) => ({ ...r, select: null })));
              show('类型切换：已清理不兼容的选择值', 'info');
            } else if (id === 'multiSelect' && type !== 'multi') {
              setData((prev) => prev.map((r) => ({ ...r, multiSelect: [] })));
              show('类型切换：已清理不兼容的多选值', 'info');
            } else if (id === 'user' && type !== 'user') {
              setData((prev) => prev.map((r) => ({ ...r, user: null })));
              show('类型切换：已清理不兼容的用户值', 'info');
            } else if (id === 'relation' && type !== 'text') {
              setData((prev) => prev.map((r) => ({ ...r, relation: null })));
              show('类型切换：已清理不兼容的关联值', 'info');
            }
          }
          show('字段已更新', 'success');
        }}
      />
      {filterOpen && (
        <ConditionBuilder
          open={filterOpen}
          columns={columnItems}
          onClose={() => setFilterOpen(false)}
          onApply={(group) => {
            const nextCount = data.filter((r) => matchesGroup(r, group, Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: m.type }])))).length;
            setActiveGroup(group);
            setFilterOpen(false);
            show(`筛选已应用，共 ${nextCount} 行`, 'success');
          }}
        />
      )}
      {colorOpen && (
        <ColorRulesDrawer
          open={colorOpen}
          columns={columnItems.filter((c) => columnVisibility[c.id] !== false)}
          onClose={() => setColorOpen(false)}
          onApplyColumnColor={onFillColorColumn}
        />
      )}
    </div>
  );
}
