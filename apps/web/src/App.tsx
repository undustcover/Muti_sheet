import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import './App.css';
import { isFirstVisibleField } from './utils/table';
import Sidebar from './components/Sidebar';
import TopBar from './components/topbar/TopBar';
import ProtectDrawer from './components/ProtectDrawer';
import MainToolbar from './components/topbar/MainToolbar';
import QueryModal from './components/QueryModal';
import { useSelectionEditing } from './hooks/useSelectionEditing';
import { useFieldOps } from './hooks/useFieldOps';
// 移除顶部统计弹窗，改为底部聚合栏
import BottomStatsBar from './components/BottomStatsBar';
import DataTable, { type DataTableHandle } from './components/DataTable';
import FieldDrawer from './components/FieldDrawer';
import { useToast } from './components/Toast';
import ConditionBuilder from './components/ConditionBuilder';
import ColorRulesDrawer from './components/ColorRulesDrawer';
import { useTableState } from './hooks/useTableState';
import { useColorRulesStore } from './stores/colorRules';
import { useColorRules } from './hooks/useColorRules';
import type { SelectOption, ColumnItem, View } from './types';
import { generateMockRows, initialColumnMeta } from './utils/data';
import { useImportExport } from './hooks/useImportExport';
import PageLayout from './components/PageLayout';
import QueryView from './components/views/QueryView';
import KanbanView from './components/views/KanbanView';
import CalendarView from './components/views/CalendarView';
import { useHotkeys } from './hooks/useHotkeys';
import { useHistoryState } from './hooks/useHistoryState';
import { useOverlays } from './hooks/useOverlays';
import { useViews } from './hooks/useViews';
import { useTopbarActions } from './hooks/useTopbarActions';
import { useToolbarActions } from './hooks/useToolbarActions';
import { getView, upsertView, listViews, removeView } from './services/viewsStore';

const initialOptions: SelectOption[] = [
  { id: 'opt-1', label: '需求' },
  { id: 'opt-2', label: '进行中' },
  { id: 'opt-3', label: '完成' },
];

export default function App() {
  const { show } = useToast();
  const [activeNav, setActiveNav] = useState<string>('table');
  const [externalNewTable, setExternalNewTable] = useState<{ id: string; name: string; description?: string } | null>(null);
  const tableRef = useRef<DataTableHandle | null>(null);
  const requestMeasure = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => tableRef.current?.measure()));
  };

  // 视图集合与当前激活视图
  const [views, setViews] = useState<View[]>([
    { id: 'view-1', name: '主数据表', protect: 'public' },
    { id: 'view-2', name: 'View 2', protect: 'public' },
  ]);
  const [activeViewId, setActiveViewId] = useState<string>('view-1');

  // 初始化：确保主数据表默认为表格视图
  const ensuredMainKindRef = useRef(false);
  useEffect(() => {
    if (ensuredMainKindRef.current) return;
    ensuredMainKindRef.current = true;
    const mainView = views.find(v => v.id === 'view-1') ?? views[0];
    if (!mainView) return;
    const persisted = getView(activeTableId, mainView.id);
    if (!persisted || persisted.kind !== 'table') {
      upsertView(activeTableId, {
        id: mainView.id,
        tableId: activeTableId,
        name: persisted?.name ?? mainView.name,
        kind: 'table',
        config: (persisted?.config ?? {}) as any,
      });
      setViews(prev => prev.map(v => (v.id === mainView.id ? { ...v, kind: 'table' } : v)));
    }
  }, []);

// 每次切换表时，加载该表的视图；若没有则创建默认主数据表视图
// 视图按表加载的初始化逻辑移动至 activeTableId 初始化之后
  // 将 kind 合并到视图数组，避免在 Tabs 中频繁读取
  // 直接使用本地 state 携带的 kind，避免渲染期访问存储
  const viewsWithKind: View[] = useMemo(() => views, [views]);

  // 统一浮层控制
  const {
    protectOpen,
    fieldDrawerOpen,
    editingFieldId,
    filterOpen,
    colorOpen,
    openProtect,
    closeProtect,
    openFieldDrawer,
    closeFieldDrawer,
    openFilter,
    closeFilter,
    openColor,
    closeColor,
  } = useOverlays({ setActiveViewId });

  const overlaysOpen = protectOpen || fieldDrawerOpen || filterOpen || colorOpen;

  // 表格与列状态
  const [rowHeight, setRowHeight] = useState<'low' | 'medium' | 'high' | 'xhigh'>('medium');
  const [freezeCount, setFreezeCount] = useState<number>(1);
  const colWidth = 120;
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

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
    createTable,
  } = useTableState({ initialTableId: 'tbl-1', initialColumnMeta, generateRows: generateMockRows, initialRowCount: 15 });

  // 永久隐藏 id（首字段）
  useEffect(() => {
    if (columnVisibility['id'] !== false) {
      setColumnVisibility(prev => ({ ...prev, id: false }));
    }
  }, [columnVisibility, setColumnVisibility]);
  void activeTableId; // 保留以兼容未来逻辑

  // 每次切换表时，加载该表的视图；若没有则创建默认主数据表视图
  useEffect(() => {
    if (!activeTableId) return;
    const persisted = listViews(activeTableId);
    if (!persisted || persisted.length === 0) {
      const id = 'view-1';
      const name = '主数据表';
      upsertView(activeTableId, { id, tableId: activeTableId, name, kind: 'table', config: {} as any });
      setViews([{ id, name, protect: 'public', kind: 'table' }]);
      setActiveViewId(id);
      setActiveNav('table');
    } else {
      setViews(persisted.map(v => ({ id: v.id, name: v.name, protect: v.protect ?? 'public', kind: v.kind })) as any);
      const exist = persisted.some(v => v.id === activeViewId);
      const nextActiveId = exist ? activeViewId : persisted[0].id;
      setActiveViewId(nextActiveId);
      const nextKind = persisted.find(v => v.id === nextActiveId)?.kind ?? 'table';
      setActiveNav(nextKind);
    }
  }, [activeTableId]);

  // viewsWithKind 已在上方定义为从本地 state 读取 kind
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });
  const [editingCell, setEditingCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });

  // 撤销/重做
  const {
    histSetData,
    histSetColumnMeta,
    histSetColumnOrder,
    histSetColumnVisibility,
    histSetSorting,
    undo,
    redo,
  } = useHistoryState({
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
    show,
    requestMeasure,
  });

  const fieldOps = useFieldOps({
    columnMeta,
    columnOrder,
    columnVisibility,
    histSetColumnMeta,
    histSetColumnOrder,
    histSetColumnVisibility,
    histSetSorting,
    histSetData,
    show,
    requestMeasure,
  });

  // 逻辑类型映射（供规则/过滤使用）
  const logicColumnMeta = useMemo(() => {
    const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t === 'formula' ? 'number' : t);
    return Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: mapType(m.type) }]));
  }, [columnMeta]);

  // 颜色规则（用于视图保存）
  const rules = useColorRulesStore((s) => s.rules);
  const setColorRules = useColorRulesStore((s) => s.setRules);

  // 视图：过滤/查询/配置
  const {
    activeGroup,
    setActiveGroup,
    filteredByGroup,
    applyGroup,
    clearGroup,
    viewConfigMap,
    updateStatsAgg,
    viewKind,
    setViewKind,
    kanbanGroupFieldId,
    setKanbanGroupField,
    calendarFields,
    setCalendarFields,
    activeQuery,
    applyQuery,
    queryFocusTick,
    queryOpen,
    openQuery,
    closeQuery,
    filteredData,
  } = useViews({
    data,
    columnMeta,
    logicColumnMeta,
    activeViewId,
    tableId: activeTableId,
    sorting,
    freezeCount,
    columnVisibility,
    columnOrder,
    columnWidths: colWidths,
    rowHeight,
    columnColors,
    colorRules: rules,
    setSorting,
    setFreezeCount,
    setColumnVisibility,
    setColumnOrder,
    setColumnWidths: setColWidths,
    setRowHeight,
    setColumnColors,
    setColorRules,
    show,
  });

  // 编辑相关
  const { clearSelectedCellContent } = useSelectionEditing({ selectedCell, columnMeta, histSetData, show });

  useHotkeys({
    activeNav,
    onUndo: undo,
    onRedo: redo,
    onOpenQuery: openQuery,
    onDeleteSelectedCell: clearSelectedCellContent,
    selectedCellRowId: selectedCell.rowId,
  });

  const columnItems: ColumnItem[] = useMemo(() => (
    columnOrder
      .filter((id) => id !== 'id' && !!columnMeta[id])
      .map((id) => ({ id, name: columnMeta[id].name, type: columnMeta[id].type }))
  ), [columnMeta, columnOrder]);

  const visibleCount = useMemo(() => Object.keys(columnMeta).filter((id) => columnVisibility[id] !== false).length, [columnMeta, columnVisibility]);

  useEffect(() => {
    if (freezeCount > visibleCount) {
      setFreezeCount(Math.max(0, visibleCount));
    }
  }, [freezeCount, visibleCount]);

  const hasHidden = useMemo(() => Object.values(columnVisibility).some((v) => v === false), [columnVisibility]);
  const hiddenToastShownRef = useRef(false);
  const onlyFrozenToastShownRef = useRef(false);

  const { getCellBg } = useColorRules({ rules, columnMeta: logicColumnMeta, columnColors });

  const countGroupConds = (grp: any): number => {
    if (!grp || !Array.isArray(grp.conditions)) return 0;
    return grp.conditions.reduce((acc: number, it: any) => (
      acc + (it && 'conditions' in it ? countGroupConds(it) : 1)
    ), 0);
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

  // 导入/导出（保留导出使用旧钩子，导入改为创建新表）
  const { onExport } = useImportExport({ data, setData: histSetData, columnMeta, show, requestMeasure });

  const onImport = ({ fileName, sheetName, header, rows }: { fileName: string; sheetName: string; header: any[]; rows: any[][] }) => {
    const newTableId = `tbl-import-${Date.now()}`;

    // 生成列ID与名称
    const colInfo = header.map((name: any, idx: number) => ({ id: `col_${idx + 1}`, name: String(name ?? `列${idx + 1}`) }));
    // 推断列类型
    const inferType = (values: any[]): 'text' | 'number' | 'date' => {
      const samples = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').slice(0, 24);
      if (samples.length === 0) return 'text';
      const numCount = samples.filter(v => Number.isFinite(Number(v))).length;
      const dateCount = samples.filter(v => dayjs(String(v)).isValid()).length;
      if (dateCount > numCount && dateCount >= samples.length * 0.6) return 'date';
      if (numCount > 0 && numCount >= samples.length * 0.6) return 'number';
      return 'text';
    };
    const nextMeta: Record<string, { name: string; type: string }> = {};
    colInfo.forEach((c, idx) => {
      const colValues = rows.map(r => r?.[idx]);
      const t = inferType(colValues);
      nextMeta[c.id] = { name: c.name, type: t };
    });
    // 构造行数据
    const nextData = rows.map((arr, i) => {
      const obj: any = { id: `rec-${i + 1}-${Date.now()}` };
      colInfo.forEach((c, idx) => {
        const val = arr?.[idx];
        const t = nextMeta[c.id].type;
        if (t === 'number') {
          const n = Number(val);
          obj[c.id] = Number.isFinite(n) ? n : 0;
        } else if (t === 'date') {
          const d = dayjs(String(val));
          obj[c.id] = d.isValid() ? d.toISOString() : '';
        } else {
          obj[c.id] = val == null ? '' : String(val);
        }
      });
      return obj;
    });
    // 在指定的新表ID下写入结构与数据
    createTable(newTableId, {
      columnMeta: nextMeta as any,
      columnOrder: colInfo.map(c => c.id),
      data: nextData as any,
      columnVisibility: {},
      sorting: [],
    });
    // 自动切换到新表
    setActiveTableId(newTableId);
    // 在侧栏显示并命名为文件名
    setExternalNewTable({ id: newTableId, name: fileName });
    show(`已创建并切换到新表（${fileName}），导入 ${nextData.length} 行，工作表：${sheetName}`, 'success');
    requestMeasure();
  };

  // 列变更
  const onColumnsChange = (cols: ColumnItem[]) => {
    setColumnMeta((meta) => {
      const next = { ...meta } as Record<string, any>;
      cols.forEach((c) => {
        if (c.id === 'id' && !(['text','date','number'] as string[]).includes(c.type)) {
          next[c.id] = { name: c.name, type: 'text', description: next[c.id]?.description };
        } else {
          next[c.id] = { name: c.name, type: c.type, description: next[c.id]?.description };
        }
      });
      return next;
    });
  };

  // 隐藏字段
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

  // 顶栏动作
  const { showAllHidden, onToggleFieldVisibility, onInsertLeft, onInsertRight } = useTopbarActions({
    columnMeta,
    setColumnVisibility,
    histSetColumnVisibility,
    setColumnOrder,
    show,
    requestMeasure,
  });

  // 工具栏动作
  const { onDeleteField, onFillColorColumn, onAddRecord, onCreateField, onEditField: onEditFieldFromHook, onSortOpen } = useToolbarActions({
    fieldOps,
    setColumnColors,
    show,
    histSetData,
    requestMeasure,
    openFieldDrawer,
    generateFieldId: () => `field-${Date.now()}`,
  });

  // 复制字段
  const onDuplicateField = (id: string) => {
    if (!columnMeta[id]) { show('字段不存在', 'warning'); return; }
    const base = columnMeta[id];
    const newId = `${id}-${Date.now()}`;
    const newName = `${base.name} 副本`;
    histSetColumnMeta(prev => ({ ...prev, [newId]: { ...base, name: newName } }));
    histSetColumnOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return [...prev, newId];
      return [...prev.slice(0, idx + 1), newId, ...prev.slice(idx + 1)];
    });
    histSetColumnVisibility(prev => ({ ...prev, [newId]: true }));
    histSetData(prev => prev.map(r => ({ ...r, [newId]: (r as any)[id] })));
    show('已复制字段', 'success');
    requestMeasure();
  };

  const onFreezeTo = (n: number) => setFreezeCount(n);

  const currentProtect = views.find(v => v.id === activeViewId)?.protect ?? 'public';
  const setProtectMode = (m: 'public' | 'locked' | 'personal') => {
    setViews(prev => prev.map(v => (v.id === activeViewId ? { ...v, protect: m } : v)));
  };

  return (
    <>
      <PageLayout
        sidebar={<Sidebar active={activeNav} onNavigate={setActiveNav} onSelectTable={(id) => setActiveTableId(id)} externalNewTable={externalNewTable} />}
        header={(
          <TopBar
            views={viewsWithKind}
            activeViewId={activeViewId}
            tableId={activeTableId}
            onSelect={(id) => {
              setActiveViewId(id);
              const nextKind = viewsWithKind.find(v => v.id === id)?.kind ?? 'table';
              setActiveNav(nextKind);
            }}
            onAddWithKind={(kind) => {
              const id = `view-${views.length + 1}`;
              const defaultName = (
                kind === 'table' ? `表格视图 ${views.length + 1}` :
                kind === 'query' ? `查询页 ${views.length + 1}` :
                kind === 'kanban' ? `看板视图 ${views.length + 1}` :
                kind === 'calendar' ? `日历视图 ${views.length + 1}` :
                kind === 'gantt' ? `甘特图视图 ${views.length + 1}` :
                kind === 'gallery' ? `画册视图 ${views.length + 1}` :
                kind === 'form' ? `表单视图 ${views.length + 1}` : `View ${views.length + 1}`
              );
              setViews(prev => [...prev, { id, name: defaultName, protect: 'public', kind }]);
              upsertView(activeTableId, { id, tableId: activeTableId, name: defaultName, kind, config: {} as any });
              setActiveViewId(id);
              setActiveNav(kind);
            }}
            onRename={(id, name) => {
              setViews(prev => prev.map(v => (v.id === id ? { ...v, name } : v)));
              const persisted = getView(activeTableId, id);
              upsertView(activeTableId, { id, tableId: activeTableId, name, kind: persisted?.kind ?? 'table', config: persisted?.config ?? ({} as any), protect: persisted?.protect });
            }}
            onDuplicate={(id) => {
              const src = views.find(v => v.id === id);
              if (!src) return;
              const nid = `view-${Date.now()}`;
              const persisted = getView(activeTableId, id);
              const nextKind = (src as any).kind ?? persisted?.kind ?? 'table';
              const nextConfig = persisted?.config ?? ({} as any);
              setViews(prev => [...prev, { id: nid, name: `${src.name} 副本`, protect: src.protect, kind: nextKind }]);
              upsertView(activeTableId, { id: nid, tableId: activeTableId, name: `${src.name} 副本`, kind: nextKind, config: nextConfig, protect: persisted?.protect });
              setActiveViewId(nid);
            }}
            onDelete={(id) => {
              setViews(prev => prev.filter(v => v.id !== id));
              removeView(activeTableId, id);
              if (activeViewId === id) {
                const remain = views.filter(v => v.id !== id);
                if (remain.length > 0) setActiveViewId(remain[0].id);
              }
            }}
            onProtectClick={(id) => openProtect(id)}
          />
        )}
        toolbar={(
          <div aria-hidden={overlaysOpen}>
            <MainToolbar
              columns={columnItems}
              onColumnsChange={onColumnsChange}
              rowHeight={rowHeight}
              onRowHeightChange={(h) => { setRowHeight(h); requestMeasure(); }}
              onFilterOpen={openFilter}
              onColorOpen={openColor}
              onShowAllHidden={showAllHidden}
              onAddRecord={onAddRecord}
              onImport={onImport}
              onExport={onExport}
              columnVisibility={columnVisibility as any}
              onToggleFieldVisibility={onToggleFieldVisibility}
              onUndo={undo}
              onRedo={redo}
              onQuery={openQuery}
              onDelete={() => show('删除记录暂未实现', 'info')}
              onSortOpen={onSortOpen}
              onCreateField={onCreateField}
              onEditField={onEditFieldFromHook}
            />
          </div>
        )}
      >
        {activeNav === 'table' && (
          <>
            
            <DataTable
              ref={tableRef}
              rows={filteredData}
              columnMeta={columnMeta as any}
              columnOrder={columnOrder}
              columnVisibility={columnVisibility as any}
              sorting={sorting}
              setSorting={setSorting}
              setColumnVisibility={setColumnVisibility as any}
              setColumnOrder={setColumnOrder}
              setData={histSetData as any}
              setColumnMeta={setColumnMeta as any}
              rowHeight={rowHeight}
              freezeCount={freezeCount}
              onFreezeTo={onFreezeTo}
              colWidth={colWidth}
              colWidths={colWidths}
              setColWidths={setColWidths}
              defaultSelectOptions={initialOptions}
              getCellBg={getCellBg}
              selectedCell={selectedCell}
              editingCell={editingCell}
              setSelectedCell={setSelectedCell}
              setEditingCell={setEditingCell}
              onEditField={onEditFieldFromHook}
              onHideField={onHideField}
              onDeleteField={onDeleteField}
              onInsertLeft={onInsertLeft}
              onInsertRight={onInsertRight}
              onDuplicateField={onDuplicateField}
              onFillColorColumn={onFillColorColumn}
              onCreateField={onCreateField}
            />
            <BottomStatsBar
              columns={columnItems}
              rows={filteredData}
              columnVisibility={columnVisibility as any}
              statsAggByField={viewConfigMap[activeViewId]?.statsAggByField ?? {}}
              columnOrder={columnOrder}
              colWidths={colWidths}
              defaultColWidth={colWidth}
              freezeCount={freezeCount}
              onChangeAgg={(fieldId, agg) => {
                updateStatsAgg(fieldId, agg as any);
              }}
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

        {activeNav === 'query' && (
          <QueryView
            rows={filteredData}
            columnMeta={columnMeta as any}
            columnOrder={columnOrder}
            columnVisibility={columnVisibility as any}
            sorting={sorting}
            setSorting={setSorting}
            setColumnVisibility={setColumnVisibility as any}
            setColumnOrder={setColumnOrder}
            setData={histSetData as any}
            setColumnMeta={setColumnMeta as any}
            rowHeight={rowHeight}
            freezeCount={freezeCount}
            onFreezeTo={onFreezeTo}
            colWidth={colWidth}
            colWidths={colWidths}
            setColWidths={setColWidths}
            defaultSelectOptions={initialOptions}
            getCellBg={getCellBg}
            selectedCell={selectedCell}
            editingCell={editingCell}
            setSelectedCell={setSelectedCell}
            setEditingCell={setEditingCell}
            onEditField={onEditFieldFromHook}
            onHideField={onHideField}
            onDeleteField={onDeleteField}
            onInsertLeft={onInsertLeft}
            onInsertRight={onInsertRight}
            onDuplicateField={onDuplicateField}
            onFillColorColumn={onFillColorColumn}
            onCreateField={onCreateField}
          />
        )}

        {activeNav === 'kanban' && (
          <KanbanView
            rows={filteredData as any}
            columnMeta={columnMeta as any}
            setData={histSetData as any}
            defaultSelectOptions={initialOptions}
            groupFieldId={kanbanGroupFieldId ?? undefined}
            onChangeGroupFieldId={(fid: string) => setKanbanGroupField(fid)}
          />
        )}

        {activeNav === 'calendar' && (
          <CalendarView
            rows={filteredData as any}
            columnMeta={columnMeta as any}
            setData={histSetData as any}
            startDateFieldId={calendarFields.startDateFieldId ?? undefined}
            endDateFieldId={calendarFields.endDateFieldId ?? undefined}
            onChangeDateFields={(sid: string | null, eid?: string | null) => setCalendarFields(sid, eid)}
          />
        )}

        {activeNav === 'gantt' && (
          <div style={{ padding: 24 }}>
            <h3>甘特图视图</h3>
            <p>任务时间线与依赖展示（占位）。</p>
          </div>
        )}

        {activeNav === 'gallery' && (
          <div style={{ padding: 24 }}>
            <h3>画册视图</h3>
            <p>图片或卡片瀑布流展示（占位）。</p>
          </div>
        )}

        {activeNav === 'form' && (
          <div style={{ padding: 24 }}>
            <h3>表单视图</h3>
            <p>表单设计与提交收集（占位）。</p>
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
      </PageLayout>

      {/* 浮层：保护设置 */}
      {protectOpen && (
        <ProtectDrawer
          open={protectOpen}
          onClose={closeProtect}
          mode={(views.find(v => v.id === activeViewId)?.protect ?? 'public') as 'public' | 'locked' | 'personal'}
          onModeChange={(m) => setViews(prev => prev.map(v => (v.id === activeViewId ? { ...v, protect: m } : v)))}
        />
      )}

      {/* 抽屉：字段侧边编辑 */}
      {fieldDrawerOpen && (
        <FieldDrawer
          open={fieldDrawerOpen}
          fieldId={editingFieldId}
          availableFields={Object.entries(columnMeta).map(([id, meta]) => ({ id, name: meta.name, type: meta.type }))}
          onClose={closeFieldDrawer}
          onSave={(payload) => {
            const { id, name, type, description, options, formula, format } = payload;
            const exists = !!columnMeta[id];
            if (exists) {
              if (columnMeta[id].name !== name) {
                fieldOps.renameField(id, name);
              }
              fieldOps.changeType(id, type as any, { options, formula, format });
              if (description !== undefined) {
                histSetColumnMeta(prev => ({ ...prev, [id]: { ...prev[id], description } }));
              }
            } else {
              fieldOps.addField(id, { id, name, type });
              if (description !== undefined) {
                histSetColumnMeta(prev => ({ ...prev, [id]: { ...prev[id], description } }));
              }
              if (type === 'single' || type === 'multi' || type === 'number' || type === 'formula') {
                fieldOps.changeType(id, type as any, { options, formula, format });
              }
            }
            closeFieldDrawer();
          }}
        />
      )}

      {/* 抽屉：过滤器 */}
      {filterOpen && (
        <ConditionBuilder
          open={filterOpen}
          columns={columnItems}
          onClose={closeFilter}
          initialGroup={activeGroup as any}
          onClear={() => { clearGroup(); closeFilter(); show('已清除筛选', 'info'); }}
          onApply={(group) => {
            const nextCount = applyGroup(group);
            closeFilter();
            show(`筛选已应用，共 ${nextCount} 行`, 'success');
          }}
        />
      )}

      {/* 模态：颜色规则 */}
      {colorOpen && (
        <ColorRulesDrawer
          open={colorOpen}
          onClose={closeColor}
          columns={columnItems}
          onApplyColumnColor={(cid, color) => setColumnColors((prev) => ({ ...prev, [cid]: color }))}
        />
      )}
    </>
  );
}
