import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
// duplicate imports removed
import './App.css';
import { isFirstVisibleField } from './utils/table';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import ProtectDrawer from './components/ProtectDrawer';
import Toolbar from './components/Toolbar';
import DataTable, { type DataTableHandle } from './components/DataTable';
import FieldDrawer from './components/FieldDrawer';
import { useToast } from './components/Toast';
import ConditionBuilder from './components/ConditionBuilder';
import ColorRulesDrawer from './components/ColorRulesDrawer';
import { useTableState } from './hooks/useTableState';
import { useColorRulesStore } from './stores/colorRules';
import type { ConditionGroup } from './stores/colorRules';
import { matchesGroup, applyColorBackground } from './utils/logic';
import type { User, SelectOption, FormulaConfig, NumberFormat, RowRecord, ColumnItem, View } from './types';

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
    text: String(i + 1), // 序号字段显示行号，从 1 开始，转换为字符串
    number: Math.round(Math.random() * 1000),
    date: dayjs().subtract(i, 'day').toISOString(),
    select: initialOptions[(i + 1) % initialOptions.length],
    multiSelect: [initialOptions[i % initialOptions.length]],
    relation: i % 5 === 0 ? `rec-${i}` : null,
    user: mockUsers[i % mockUsers.length],
  }));
}



export default function App() {
  const { show } = useToast();
  const [activeNav, setActiveNav] = useState<string>('table');
  const tableRef = useRef<DataTableHandle | null>(null);
  const requestMeasure = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => tableRef.current?.measure()));
  };
  // 由 useTableState 管理表级状态与当前激活表

  const [views, setViews] = useState<View[]>([
    { id: 'view-1', name: '视图1', protect: 'public' },
    { id: 'view-2', name: '视图2', protect: 'public' },
  ]);
  const [activeViewId, setActiveViewId] = useState<string>('view-1');
  const [protectOpen, setProtectOpen] = useState(false);

  const [rowHeight, setRowHeight] = useState<'low' | 'medium' | 'high' | 'xhigh'>('medium');
  const [freezeCount, setFreezeCount] = useState<number>(1);
  const colWidth = 160;
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);


  // Column meta (header names & types)
  const initialColumnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }> = {
    id: { name: 'ID', type: 'text', description: '' },
    text: { name: '序号', type: 'number', description: '', format: { decimals: 0, thousand: false } },
    number: { name: '数字', type: 'number', description: '', format: { decimals: 0, thousand: false } },
    date: { name: '日期', type: 'date', description: '' },
    select: { name: '选择', type: 'single', description: '', options: initialOptions },
    multiSelect: { name: '多选', type: 'multi', description: '', options: initialOptions },
    relation: { name: '关联', type: 'text', description: '' },
    user: { name: '用户', type: 'user', description: '' },
  };
  const {
    activeTableId,
    setActiveTableId,
    data,
    columnMeta,
    columnOrder,
    columnVisibility,
    sorting,
    setData,
    setColumnMeta,
    setColumnOrder,
    setColumnVisibility,
    setSorting,
  } = useTableState({ initialTableId: 'tbl-1', initialColumnMeta, generateRows: generateMockRows, initialRowCount: 200 });

  // 默认隐藏 id 字段，用户不需要看到技术性的 ID 列
  useEffect(() => {
    if (!columnVisibility.hasOwnProperty('id')) {
      setColumnVisibility(prev => ({ ...prev, id: false }));
    }
  }, [columnVisibility, setColumnVisibility]);
  // 保留 activeTableId 以兼容未来逻辑，避免未使用警告
  void activeTableId;
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  // 选中单元格：仅选中时进入编辑态，其它保持展示态
  const [selectedCell, setSelectedCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });
  const [editingCell, setEditingCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });
  // removed legacy drag/selection range state; handled in DataTable

  // 撤销/重做：历史栈快照
  const undoStackRef = useRef<Array<{ data: RowRecord[]; columnMeta: any; columnOrder: string[]; columnVisibility: Record<string, boolean | undefined>; sorting: any }>>([]);
  const redoStackRef = useRef<Array<{ data: RowRecord[]; columnMeta: any; columnOrder: string[]; columnVisibility: Record<string, boolean | undefined>; sorting: any }>>([]);
  const captureSnapshot = () => ({
    data: data.map(r => ({ ...r })),
    columnMeta: { ...columnMeta },
    columnOrder: [...columnOrder],
    columnVisibility: { ...columnVisibility } as any,
    sorting: [...sorting] as any,
  });
  const pushUndo = () => { undoStackRef.current.push(captureSnapshot()); };
  const clearRedo = () => { redoStackRef.current = []; };
  const histSetData = (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => { pushUndo(); clearRedo(); setData(updater); };
  const histSetColumnMeta = (updater: any) => { pushUndo(); clearRedo(); setColumnMeta(updater); };
  const histSetColumnOrder = (updater: string[] | ((prev: string[]) => string[])) => { pushUndo(); clearRedo(); setColumnOrder(updater); };
  const histSetColumnVisibility = (updater: any) => { pushUndo(); clearRedo(); setColumnVisibility(updater); };
  const histSetSorting = (updater: any) => { pushUndo(); clearRedo(); setSorting(updater); };
  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) { show('没有可撤销的操作', 'info'); return; }
    redoStackRef.current.push(captureSnapshot());
    setData(prev.data);
    setColumnMeta(prev.columnMeta);
    setColumnOrder(prev.columnOrder);
    setColumnVisibility(prev.columnVisibility as any);
    setSorting(prev.sorting as any);
    requestMeasure();
  };
  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) { show('没有可重做的操作', 'info'); return; }
    undoStackRef.current.push(captureSnapshot());
    setData(next.data);
    setColumnMeta(next.columnMeta);
    setColumnOrder(next.columnOrder);
    setColumnVisibility(next.columnVisibility as any);
    setSorting(next.sorting as any);
    requestMeasure();
  };
  const openQuery = () => setFilterOpen(true);
  const deleteSelectedRow = () => {
    const rowId = selectedCell.rowId;
    if (!rowId) { show('请先选中一行', 'warning'); return; }
    histSetData((prev) => prev.filter((r) => r.id !== rowId));
    show('已删除选中行', 'success');
    requestMeasure();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeNav !== 'table') return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey && !e.shiftKey && key === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey && e.shiftKey && key === 'z') || (e.ctrlKey && key === 'y')) { e.preventDefault(); redo(); }
      else if (e.ctrlKey && key === 'f') { e.preventDefault(); openQuery(); }
      else if (!e.ctrlKey && !e.metaKey && e.key === 'Delete') { e.preventDefault(); deleteSelectedRow(); }
    };
    window.addEventListener('keydown', handler as any);
    return () => window.removeEventListener('keydown', handler as any);
  }, [activeNav, selectedCell.rowId]);

  const columnItems: ColumnItem[] = useMemo(() => (
    columnOrder.filter((id) => !!columnMeta[id]).map((id) => ({ id, name: columnMeta[id].name, type: columnMeta[id].type }))
  ), [columnMeta, columnOrder]);

  // 为逻辑函数提供的列类型映射（统一为 utils/logic 需要的类型名）
  const logicColumnMeta = useMemo(() => {
    const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t === 'formula' ? 'number' : t);
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
  // removed legacy columns definition (moved to DataTable)

  // removed legacy table instance (managed in DataTable)

  // Virtual rows
  // removed legacy virtualizer (handled in DataTable)

  // 键盘导航与编辑触发
  // removed legacy keyboard navigation and range selection (in DataTable)

  // Export
  const handleExport = async () => {
    const XLSX = await import('xlsx');
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
    requestMeasure();
  };
  // 新增：导入处理（由 Toolbar 触发，已解析为行数据）
  const onImport = (rows: RowRecord[]) => {
    histSetData(rows);
    show('已导入 Excel 数据', 'success');
    requestMeasure();
  };

  const onAddRecord = () => {
    histSetData((prev) => [{
      id: `rec-${prev.length + 1}`,
      text: String(prev.length + 1), number: 0, date: dayjs().toISOString(), select: null, multiSelect: [], relation: null, user: null,
    }, ...prev]);
    requestMeasure();
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
    histSetColumnVisibility((v: any) => {
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
    histSetColumnVisibility((v: any) => {
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
    histSetColumnMeta((prev: any) => {
      const next = { ...prev } as Record<string, { name: string; type: string; description?: string }>;
      delete next[id];
      return next;
    });
    histSetColumnOrder((order) => order.filter((x) => x !== id));
    histSetColumnVisibility((v: any) => {
      const { [id]: _, ...rest } = v;
      return rest;
    });
    histSetSorting((s: any) => s.filter((x: any) => x.id !== id));
    requestMeasure();
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
    requestMeasure();
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
    requestMeasure();
  };
  const onDuplicateField = (id: string) => { void id; show('当前版本为固定字段集，复制字段暂不支持', 'info'); };
  const onFillColorColumn = (columnId: string, color: string) => {
    setColumnColors((prev) => ({ ...prev, [columnId]: color }));
    show('整列填色已应用', 'success');
  };

  const showAllHidden = () => { setColumnVisibility({}); };

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
      <Sidebar active={activeNav} onNavigate={setActiveNav} onSelectTable={setActiveTableId} />

      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              onUndo={undo}
              onRedo={redo}
              onQuery={openQuery}
              onDelete={deleteSelectedRow}
            />
          </div>
        )}

        {/* 内容区：允许页面滚动，移除容器隐藏溢出 */}
        <div style={{ padding: 0, overflow: 'visible', flex: 1, minHeight: 0 }}>
          {activeNav === 'table' && (
            <>
              <DataTable
                ref={tableRef}
                rows={filteredData}
                columnMeta={columnMeta}
                columnOrder={columnOrder}
                columnVisibility={columnVisibility}
                sorting={sorting}
                setSorting={histSetSorting}
                setColumnVisibility={histSetColumnVisibility}
                setColumnOrder={histSetColumnOrder}
                setData={histSetData}
                setColumnMeta={histSetColumnMeta}
                rowHeight={rowHeight}
                freezeCount={freezeCount}
                onFreezeTo={(n) => setFreezeCount(n)}
                colWidth={colWidth}
                defaultSelectOptions={initialOptions}
                getCellBg={getCellBg}
                selectedCell={selectedCell}
                editingCell={editingCell}
                setSelectedCell={setSelectedCell}
                setEditingCell={setEditingCell}
                onEditField={onEditField}
                onHideField={onHideField}
                onDeleteField={onDeleteField}
                onInsertLeft={onInsertLeft}
                onInsertRight={onInsertRight}
                onDuplicateField={onDuplicateField}
                onFillColorColumn={onFillColorColumn}
                onCreateField={() => { const newId = `field-${Date.now()}`; setEditingFieldId(newId); setFieldDrawerOpen(true); }}
              />
              {Object.values(columnVisibility).some((v) => v === false) && (
                <div style={{ padding: '6px 0', fontSize: 12, color: '#666' }}>
                  已隐藏部分字段。<span role="button" style={{ color: '#2563eb', cursor: 'pointer' }} onClick={showAllHidden}>显示已隐藏字段</span>
                  {visibleCount > 0 && visibleCount <= freezeCount && (
                    <div style={{ marginTop: 4 }}>已隐藏所有非冻结列，仅展示冻结列。</div>
                  )}
                </div>
              )}
            </>
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
        initialOptions={editingFieldId ? (columnMeta[editingFieldId]?.options ?? []) : []}
        initialFormula={editingFieldId ? (columnMeta[editingFieldId]?.formula) : undefined}
        initialNumberFormat={editingFieldId ? (columnMeta[editingFieldId]?.format) : undefined}
        availableFields={columnItems}
        disabledTypeEdit={editingFieldId === 'id'}
        limitTypesTo={(editingFieldId && isFirstVisibleField(editingFieldId, columnOrder, columnVisibility)) ? (['text','number','date','formula'] as any) : undefined}
        onClose={() => { setFieldDrawerOpen(false); setEditingFieldId(null); }}
        onSave={({ id, name, type, description, options, formula, format }) => {
          const isFirstField = isFirstVisibleField(id, columnOrder, columnVisibility);
          const allowedFirstTypes = new Set(['text','number','date','formula']);
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
          const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
          const prevType = columnMeta[id]?.type;
          const prevOptions = (columnMeta[id]?.options ?? []);
          const nextOptions = (type === 'single' || type === 'multi') ? (options ?? prevOptions) : [];
          const isNew = !(id in columnMeta);
          if (isFirstField && !allowedFirstTypes.has(type as any)) {
            show('首字段类型仅支持：文本、数字、日期、公式', 'warning');
            return;
          }
          histSetColumnMeta((prev: any) => {
            const next = { ...prev } as any;
            if (id === 'id' && !(['text','date','number'] as string[]).includes(type)) {
              next[id] = { name: trimmed, type: 'text', description };
            } else {
              const meta: any = { name: trimmed, type, description };
              if (type === 'single' || type === 'multi') {
                meta.options = options ?? prev[id]?.options ?? [];
              }
              if (type === 'formula') {
                meta.formula = formula ?? prev[id]?.formula ?? undefined;
              } else {
                if (meta.formula) delete meta.formula;
              }
              if (type === 'number') {
                meta.format = format ?? prev[id]?.format ?? { decimals: 0, thousand: false };
              } else {
                if (meta.format) delete meta.format;
              }
              next[id] = meta;
              if (!(type === 'single' || type === 'multi')) {
                // 清理非单选/多选的残留选项
                if (next[id] && 'options' in next[id]) delete next[id].options;
              }
            }
            return next;
          });
          if (isNew) {
            histSetColumnOrder((order) => [...order, id]);
            histSetColumnVisibility((v: any) => ({ ...v, [id]: true }));
            const t = normalizeType(type);
            if (t !== 'formula') {
              const defaultValue = t === 'text' ? ''
                : t === 'number' ? 0
                : t === 'date' ? dayjs().toISOString()
                : t === 'select' ? null
                : t === 'multiSelect' ? []
                : t === 'user' ? null
                : t === 'relation' ? null
                : '';
              histSetData((prev) => prev.map((r) => ({ ...r, [id]: defaultValue })));
            }
            show('已新增字段', 'success');
          } else if (prevType !== type) {
            const prevNorm = normalizeType(prevType ?? 'text');
            const nextNorm = normalizeType(type);
            if (prevNorm !== nextNorm) {
              if (nextNorm !== 'formula') {
                const defaultValue = nextNorm === 'text' ? ''
                  : nextNorm === 'number' ? 0
                  : nextNorm === 'date' ? dayjs().toISOString()
                  : nextNorm === 'select' ? null
                  : nextNorm === 'multiSelect' ? []
                  : nextNorm === 'user' ? null
                  : nextNorm === 'relation' ? null
                  : '';
                histSetData((prev) => prev.map((r) => ({ ...r, [id]: defaultValue })));
                show('类型切换：已根据新类型重置列值', 'info');
              } else {
                show('类型切换：公式列为只读，值由其他字段自动计算', 'info');
              }
            }
          } else {
            show('字段已更新', 'success');
          }
          // 当选项被删减时，清理当前数据中引用了已删除选项的值
          const removedIds = new Set(prevOptions.filter((o) => !nextOptions.some((n) => n.id === o.id)).map((o) => o.id));
          if (removedIds.size > 0) {
            const tnorm = normalizeType(type);
            histSetData((prev) => prev.map((r) => {
              const v: any = (r as any)[id];
              if (tnorm === 'select') {
                if (v && removedIds.has(v.id)) {
                  return { ...r, [id]: null } as any;
                }
              } else if (tnorm === 'multiSelect') {
                if (Array.isArray(v) && v.length > 0) {
                  const nv = v.filter((opt: SelectOption) => !removedIds.has(opt.id));
                  if (nv.length !== v.length) {
                    return { ...r, [id]: nv } as any;
                  }
                }
              }
              return r;
            }));
            show('选项删减：已清理无效选择', 'info');
          }
          requestMeasure();
        }}
      />
      {filterOpen && (
        <ConditionBuilder
          open={filterOpen}
          columns={columnItems}
          onClose={() => setFilterOpen(false)}
          onApply={(group) => {
            const nextCount = data.filter((r) => matchesGroup(r, group, logicColumnMeta)).length;
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
