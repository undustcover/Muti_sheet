import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import './App.css';
import { isFirstVisibleField } from './utils/table';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import ProtectDrawer from './components/ProtectDrawer';
import Toolbar from './components/Toolbar';
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
import type { ConditionGroup } from './stores/colorRules';
import { matchesGroup, applyColorBackground } from './utils/logic';
import type { SelectOption, RowRecord, ColumnItem, View } from './types';
import { generateMockRows, initialColumnMeta } from './utils/data';
import { useImportExport } from './hooks/useImportExport';
import PageLayout from './components/PageLayout';
import { useHotkeys } from './hooks/useHotkeys';
import { useHistoryState } from './hooks/useHistoryState';
import { useOverlays } from './hooks/useOverlays';
import { useViews } from './hooks/useViews';

const initialOptions: SelectOption[] = [
  { id: 'opt-1', label: '需求' },
  { id: 'opt-2', label: '进行中' },
  { id: 'opt-3', label: '完成' },
];





// mock 数据生成与初始列元数据移至 utils/data.ts

export default function App() {
  const { show } = useToast();
  const [activeNav, setActiveNav] = useState<string>('table');
  const tableRef = useRef<DataTableHandle | null>(null);
  const requestMeasure = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => tableRef.current?.measure()));
  };
  // 由 useTableState 管理表级状态与当前激活表

  const [views, setViews] = useState<View[]>([
    { id: 'view-1', name: '主数据表', protect: 'public' },
    { id: 'view-2', name: 'View 2', protect: 'public' },
  ]);
  const [activeViewId, setActiveViewId] = useState<string>('view-1');
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

  const [rowHeight, setRowHeight] = useState<'low' | 'medium' | 'high' | 'xhigh'>('medium');
  const [freezeCount, setFreezeCount] = useState<number>(1);
  const colWidth = 120;
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  // overlay states managed by useOverlays
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
  } = useTableState({ initialTableId: 'tbl-1', initialColumnMeta, generateRows: generateMockRows, initialRowCount: 15 });

    // 永久隐藏 id（首字段）：默认隐藏且任何情况下都保持隐藏
    useEffect(() => {
      if (columnVisibility['id'] !== false) {
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

    // 撤销/重做：历史栈快照（提取为 Hook）
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

    // 为逻辑函数提供的列类型映射（统一为 utils/logic 需要的类型名）
    const logicColumnMeta = useMemo(() => {
      const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t === 'formula' ? 'number' : t);
      return Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: mapType(m.type) }]));
    }, [columnMeta]);

    // 视图级查询/过滤/配置：统一由 useViews 管理
    const {
      activeGroup,
      setActiveGroup,
      filteredByGroup,
      applyGroup,
      // clearGroup,
      viewConfigMap,
      updateStatsAgg,
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
      sorting,
      freezeCount,
      columnVisibility,
      columnOrder,
      columnWidths: colWidths,
      rowHeight,
      setSorting,
      setFreezeCount,
      setColumnVisibility,
      setColumnOrder,
      setColumnWidths: setColWidths,
      setRowHeight,
      show,
    });

    // 仅清空选中单元格内容，不删除单元格或行
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

    // const logicColumnMeta = useMemo(() => {
    //   const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t === 'formula' ? 'number' : t);
    //   return Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: mapType(m.type) }]));
    // }, [columnMeta]);
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
    // const [activeGroup, setActiveGroup] = useState<ConditionGroup | null>(null);
    // const { activeGroup, setActiveGroup, filteredByGroup, applyGroup } = useFilterGroup({ data, columnMeta: logicColumnMeta });
    // 视图级配置：排序、冻结列数、列显隐、过滤条件、列顺序、列宽、行高、底部聚合选择（抽取为 Hook）
    // const { viewConfigMap, updateStatsAgg } = useViewConfig({
    //   activeViewId,
    //   sorting,
    //   freezeCount,
    //   columnVisibility,
    //   filterGroup: activeGroup,
    //   columnOrder,
    //   columnWidths: colWidths,
    //   rowHeight,
    //   columnMeta,
    //   setSorting,
    //   setFreezeCount,
    //   setColumnVisibility,
    //   setFilterGroup: setActiveGroup,
    //   setColumnOrder,
    //   setColumnWidths: setColWidths,
    //   setRowHeight,
    // });
    // 颜色规则读取
    const rules = useColorRulesStore((s) => s.rules);
    // 过滤后的数据
    // const filteredData = useMemo(() => {
    //   const base = filteredByGroup;
    //   if (!activeQuery) return base;
    //   return base.filter((r) => {
    //     const vals = Object.keys(columnMeta)
    //       .filter((cid) => cid !== 'id')
    //       .map((cid) => (r as any)[cid]);
    //     return vals.some((v) => {
    //       if (v == null) return false;
    //       if (typeof v === 'object') {
    //         const label = (v as any).label ?? (v as any).name ?? '';
    //         return String(label) === activeQuery;
    //       }
    //       if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
    //         const d = dayjs(v);
    //         const iso = d.isValid() ? d.toISOString() : v;
    //         const short = d.isValid() ? d.format('YYYY-MM-DD') : v;
    //         return activeQuery === iso || activeQuery === short || activeQuery === v;
    //       }
    //       return String(v) === activeQuery;
    //     });
    //   });
    // }, [filteredByGroup, activeQuery, columnMeta]);
    // 单元格背景色（综合规则与列基础色）
    // const getCellBg = (row: RowRecord, columnId: string): string | undefined => {
    //   const { cellBg, rowBg } = applyColorBackground(rules, row, columnId, columnColors, logicColumnMeta);
    //   return cellBg ?? rowBg;
    // };
    const { getCellBg } = useColorRules({ rules, columnMeta: logicColumnMeta, columnColors });

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


    // 导入/导出：通过 Hook 管理
    const { onExport, onImport } = useImportExport({ data, setData: histSetData, columnMeta, show, requestMeasure });

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
      if (id === 'id') { show('首字段已隔离为后台字段，固定隐藏', 'info'); return; }
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
      fieldOps.removeField(id);
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

    const showAllHidden = () => {
      setColumnVisibility(() => {
        const next: Record<string, boolean> = {};
        Object.keys(columnMeta).forEach((cid) => { next[cid] = true; });
        next['id'] = false; // 保持首字段隐藏
        return next;
      });
    };

    // Tabs actions
    const addView = () => {
      const n = views.length + 1;
      setViews((prev) => [...prev, { id: `view-${n}`, name: `View ${n}`, protect: 'public' }]);
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
    const currentProtect = views.find(v => v.id === activeViewId)?.protect ?? 'public';

    const setProtectMode = (m: 'public' | 'locked' | 'personal') => {
      setViews((prev) => prev.map((v) => v.id === activeViewId ? { ...v, protect: m } : v));
    };

    return (
      <>
      <PageLayout
        sidebar={<Sidebar active={activeNav} onNavigate={setActiveNav} onSelectTable={setActiveTableId} />}
        header={(
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
        )}
        toolbar={activeNav === 'table' ? (
          <Toolbar
            columns={columnItems}
            onColumnsChange={onColumnsChange}
            rowHeight={rowHeight}
            onRowHeightChange={setRowHeight}
            onFilterOpen={() => setFilterOpen(true)}
            onColorOpen={() => setColorOpen(true)}
            onShowAllHidden={showAllHidden}
            onAddRecord={onAddRecord}
            onImport={onImport}
            onExport={onExport}
            columnVisibility={columnVisibility}
            onToggleFieldVisibility={onToggleFieldVisibility}
            onUndo={undo}
            onRedo={redo}
            onQuery={openQuery}
            onDelete={clearSelectedCellContent}
            onSortOpen={() => show('排序面板暂未实现', 'info')}
            onCreateField={() => { const newId = `field-${Date.now()}`; openFieldDrawer(newId); }}
            onEditField={(id) => { openFieldDrawer(id); }}
          />
        ) : undefined}
      >
        {/* 内容区：允许页面滚动，移除容器隐藏溢出 */}
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
              colWidths={colWidths}
              setColWidths={setColWidths}
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
              onCreateField={() => { const newId = `field-${Date.now()}`; openFieldDrawer(newId); }}
            />
                {/* 底部聚合栏：按视图保存每字段的聚合类型 */}
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
            if (!trimmed) { show('字段名称不能为空', 'warning'); return; }
            if (isFirstField && !allowedFirstTypes.has(type as any)) { show('首字段类型仅支持：文本、数字、日期、公式', 'warning'); return; }

            const isNew = !(id in columnMeta);
            const prevOptions = (columnMeta[id]?.options ?? []);
            const nextOptions = (type === 'single' || type === 'multi') ? (options ?? prevOptions) : [];

            if (isNew) {
              const item: any = { name: trimmed, type, description };
              if (type === 'single' || type === 'multi') item.options = options ?? [];
              if (type === 'number') item.format = format ?? { decimals: 0, thousand: false };
              if (type === 'formula') item.formula = formula;
              fieldOps.addField(id, item);
            } else {
              // 先处理重命名（hook 内含重复名校验）
              if (columnMeta[id]?.name !== trimmed) {
                fieldOps.renameField(id, trimmed);
              }
              // 再处理类型与附加配置（包含选项删减时的数据清理）
              fieldOps.changeType(id, type as any, { options, format, formula });
            }

            // 当选项被删减时，清理当前数据中引用了已删除选项的值
            const removedIds = new Set(prevOptions.filter((o) => !nextOptions.some((n) => n.id === o.id)).map((o) => o.id));
            if (removedIds.size > 0) {
              const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
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
              const nextCount = applyGroup(group);
              closeFilter();
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
        {/* 查询弹窗 */}
        <QueryModal open={queryOpen} onClose={closeQuery} value={activeQuery} onApply={applyQuery} focusTick={queryFocusTick} />
    </>);
}
