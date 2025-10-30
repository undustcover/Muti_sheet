# App.tsx 重构方案 Todolist

## 总览
- 目标：将超千行的 `src/App.tsx` 按职责拆分为多模块，提升可读性、可维护性与扩展性，确保功能不回归。
- 范围：仅前端代码重构，不依赖后端启动；保持对外数据结构与交互不变（零新功能改动）。
- 原则：小步快跑、每步可回滚、每步均进行不回归验证；文件与命名风格延续现有代码风格。

## 重构原则
- 职责单一：每个文件聚焦一个职责（类型定义、编辑器组件、表格渲染、状态管理等）。
- 兼容现有 API：对外数据结构（`RowRecord`、`columnMeta`、`columnOrder`、`columnVisibility`、`sorting` 等）保持不变。
- 无循环依赖：编辑器组件依赖 `types` 与必要的工具函数，不直接依赖 `App`。
- 渐进式：每个节点完成后立即运行预览验证，不通过不继续下一步。

## 节点计划

### 节点 1：提取类型定义到 `src/types.ts`
- 目标：集中管理所有类型，避免在多个文件重复定义。
- 实施：
  - 创建 `apps/web/src/types.ts`，移动类型：`RowRecord`、`User`、`SelectOption`、`FormulaOp`、`FormulaConfig`、`NumberFormat`、`ColumnItem`、`View`。
  - 在 `App.tsx`、`Sidebar.tsx`、`Toolbar.tsx` 等引用处替换为从 `types.ts` 导入。
- 不回归验证：
  - 启动/刷新预览（已运行：`http://localhost:5173/` 或 `http://localhost:5174/`）。
  - 页面正常渲染，无类型相关报错（控制台/终端无红字）。
- 回滚指引：如出现编译错误，先恢复最近导入路径改动，确认 `types.ts` 导出完整且无循环依赖。

### 节点 2：提取单元格编辑器到 `src/components/editors/`
- 目标：将 `CellEditor` 及各类型编辑控件独立管理，巩固智能翻转与键盘导航等增强功能。
- 实施：
  - 创建目录 `apps/web/src/components/editors/`。
  - 拆分文件：
    - `CellEditor.tsx`：根据 `type` 分发到具体控件，保持现有 props。
    - `SingleSelectControl.tsx`：保留智能翻转、搜索、键盘导航、虚拟滚动。
    - `MultiSelectControl.tsx`：保留智能翻转、搜索、键盘导航、虚拟滚动、多选逻辑。
    - `DatePickerControl.tsx`：保留智能翻转与键盘选取。
  - `App.tsx` 中仅保留对 `CellEditor` 的导入与使用。
- 不回归验证：
  - 在表格中编辑 `select`、`multiSelect`、`date`、`user` 等字段：
    - 面板智能翻转不遮挡；
    - 键盘箭头/Enter/Escape 正常；
    - 长列表虚拟滚动不卡顿（`@tanstack/react-virtual`）。
- 回滚指引：如编辑器打开失败，优先检查 `createPortal` 容器、导入路径、控件导出名称一致性。

### 节点 3：提取表级状态为 Hook `src/hooks/useTableState.ts`
- 目标：将表级映射状态与包装 setter 固化为 Hook，`App` 作为容器层调用。
- 实施：
  - 创建 `apps/web/src/hooks/useTableState.ts`：
    - 对外提供：`activeTableId`、`setActiveTableId`、`tables`、以及包装 setter：`setData`、`setColumnMeta`、`setColumnOrder`、`setColumnVisibility`、`setSorting`。
    - 内部维护新表初始化逻辑（首次切换至新 `tableId` 自动生成默认结构与 mock 数据）。
  - 在 `App.tsx` 中移除局部表级状态，改为使用该 Hook。
- 不回归验证：
  - 侧边栏点击/新建/复制表：当前表的结构与数据独立存在；切换不串表；返回表后变更仍在。
- 回滚指引：若切换报错，检查 Hook 的导出/导入与 `Sidebar` 的 `onSelectTable` 回调连接是否正确。

### 节点 4：提取表格渲染为组件 `src/components/DataTable.tsx`
- 目标：将列定义、`useReactTable` 配置、虚拟滚动、键盘导航集中在独立组件中，App 只负责框架与工具区。
- 实施：
  - 创建 `apps/web/src/components/DataTable.tsx`：
    - 接收 props：`data`、`columnMeta`、`columnOrder`、`columnVisibility`、`sorting`、`rowHeight`、`freezeCount`、`setData`、`setSorting`、`setColumnVisibility`、`getCellBg`、`onEditField` 等；
    - 内部构建列与单元格渲染（引用 `CellEditor`），保持与现状一致；
    - 保持虚拟滚动、键盘导航逻辑。
  - `App.tsx` 仅负责：工具栏、抽屉、颜色规则、筛选、导入导出等容器层逻辑。
- 不回归验证：
  - 排序切换、列隐藏、冻结列吸附、滚动性能与现状一致；
  - 单元格编辑流畅，无焦点丢失。
- 回滚指引：若表头/单元格渲染异常，校验 `flexRender` 与列 `id`、`key`、`HeaderMenu` 的 props 传递是否完整。

### 节点 5：工具栏与抽屉侧的适配
- 目标：确保 `Toolbar`、`FieldDrawer`、`HeaderMenu`、`ConditionBuilder`、`ColorRulesDrawer` 的 props 与状态来源适配新结构。
- 实施：
  - `Toolbar` 继续从 `App` 接收 `columns`、`columnVisibility` 与操作回调；内部行为不变。
  - `FieldDrawer`、`HeaderMenu` 操作列定义或顺序时，调用 Hook 包装 setter（作用于当前激活表）。
- 不回归验证：
  - 隐藏/显示字段、调整顺序、删除/插入列：无错误且影响当前表；不可删除 `id` 字段规则仍生效。
- 回滚指引：如果操作无效，检查 `onToggleFieldVisibility`、`onInsertLeft/Right`、`onDeleteField` 是否通过包装 setter 修改当前表。

### 节点 6：清理与一致性
- 目标：去除 `App.tsx` 中已冗余的逻辑，统一导入路径，维持代码风格一致。
- 实施：
  - 删除被抽取后的重复代码；统一 `import` 路径；避免未使用变量；
  - 将通用工具函数（如 `applyColorBackground`、`matchesGroup`）保留在 `utils`，仅调整调用方导入。
- 不回归验证：
  - 刷新预览，走一遍主流程：选择表 → 编辑字段 → 筛选 → 颜色规则 → 导入导出；无报错与功能回归。
- 回滚指引：如某功能失效，优先对比迁移前后 `props` 与调用链，恢复对应导入或 props 传递。

### 新增节点（进一步拆分方案）
- 节点 N12：提取视图配置为 Hook `src/hooks/useViewConfig.ts`
  - 目标：将视图切换时的“应用/初始化”和状态变化的“持久化”逻辑抽离，减少容器副作用块。
  - 实施：创建 Hook 管理 `viewConfigMap`、封装 `updateStatsAgg(fieldId, agg)`；传入当前状态与对应 setter 在视图切换时应用，状态变化时持久化到当前视图。
  - 不回归验证：切换视图时配置正确应用；底部聚合栏的每字段聚合类型保持与视图一致；预览交互无回归。
- 节点 N13：提取过滤逻辑为 Hook `useFilterGroup`
  - 目标：集中管理 `activeGroup` 与套用 `matchesGroup` 的过滤结果，隔离高频计算。
  - 实施：提供过滤结果与应用方法；与查询叠加时保持一致性。
- 节点 N14：提取颜色规则桥接为 Hook `useColorRules`
  - 目标：对接 `useColorRulesStore` 和 `applyColorBackground`，统一列基础色与规则色的组合。
  - 实施：提供 `getCellBg(row, columnId)` 计算，隔离横切逻辑。
- 节点 N15：导入/导出为 Hook `useImportExport`
  - 目标：抽离 IO 与数据规约逻辑，容器只触发事件。
  - 实施：封装 `onImport` 与 `onExport`，统一格式校验与字段映射。
- 节点 N16：快捷键与布局拆分
  - 目标：抽离 `undo/redo/query/delete` 等快捷键与页面布局片段（`TopBarLayout`、`MainPane`）。
  - 实施：减少容器层的事件绑定与 JSX 体量，提升可读性。

## 里程碑与提交规范
- 每个节点完成后：
  - 运行本地预览验证（页面已在 `http://localhost:5173/`/`5174`/`5175`）。
  - 生成一次提交：
    - `git add -A`
    - `git commit -m "refactor(app): step N - <简述>"`
- 完成所有节点后：
  - 生成合并提交或标签：`git tag -a v0.0.9 -m "refactor: split App.tsx into modules"`（版本号可按实际进度调整）。

## 风险与注意事项
- 入口 `App.tsx` 的 `createPortal` 与智能翻转逻辑需保持工作容器为 `document.body`；抽取后注意层级与样式不遮挡。
- 侧边栏与表状态的连接：`onSelectTable` 必须更新 `activeTableId`，否则无法切换表级数据。
- 避免修改对外数据结构字段名（例如 `RowRecord.select`、`multiSelect`、`user` 等），否则影响筛选/导出。
- 如需后端接入，Hook 层可替换 `mock` 数据获取为 API，不影响组件结构。

## 执行者操作清单（Trae 可直接按序执行）
- [x] 节点 1：创建 `src/types.ts`，迁移类型与导入；刷新预览。✅ 已完成
- [x] 节点 2：创建 `src/components/editors/` 并迁移编辑器组件；刷新预览并逐项验证输入行为。✅ 已完成
- [x] 节点 3：创建 `src/hooks/useTableState.ts` 并替换 `App.tsx` 的表级状态；刷新预览并验证表切换。✅ 已完成
- [x] 节点 4：创建 `src/components/DataTable.tsx`，迁移表格渲染；刷新预览并验证排序/隐藏/冻结/滚动。✅ 已完成
- [x] 节点 5：适配工具栏与抽屉的 props 与回调；刷新预览并验证列操作。✅ 已完成
- [x] 节点 6：清理冗余与统一导入；完整走一遍主流程；提交合并或打标签。✅ 已完成（近期：移除过时注释、适配 `onSortOpen`、全量测试通过、预览正常）
- [x] 节点 N12：`useViewConfig` 抽取与接入；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useViewConfig.ts`，将视图切换时的应用/初始化与状态变化持久化逻辑迁移至 Hook，并提供 `updateStatsAgg` 方法。`App.tsx` 移除对应 `useEffect` 并改为调用 Hook；修复初始化顺序导致的 `sorting` 未定义问题；`npm run test:run` 全部通过；`http://localhost:5175/` 预览正常。
- [x] 节点 N13：`useFilterGroup` 抽取与接入；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useFilterGroup.ts`，集中管理 `activeGroup` 与基于 `matchesGroup` 的过滤结果；`App.tsx` 改为使用 Hook 返回的 `filteredByGroup` 作为查询过滤的基础，并将 `ConditionBuilder.onApply` 替换为 `applyGroup`。`npm run test:run` 全部通过；`http://localhost:5175/` 预览正常。
- [x] 节点 N14：`useColorRules` 抽取与接入；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useColorRules.ts`，封装对 `applyColorBackground` 的调用，统一列基础色与规则色的组合为 `getCellBg(row, columnId)`；`App.tsx` 用 Hook 替代本地背景色计算函数，并保持 `columnColors` 与 `useColorRulesStore` 的读取方式。`npm run test:run` 全部通过；`http://localhost:5175/` 预览正常。
- [x] 节点 N15：`useImportExport` 抽取与接入；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useImportExport.ts`，封装 Excel 的导出与导入解析（基于 `xlsx`），以 `onExport()`、`onImport(rawRows)` 对外；在 `App.tsx` 注入 Hook 并将 Toolbar 的 `onExport`/`onImport` 接入 Hook 返回方法；保持 `histSetData`、`show` 与 `requestMeasure` 的调用语义。`npm run test:run` 全部通过；`http://localhost:5175/` 预览正常。
- [x] 节点 N16：快捷键与布局拆分；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useHotkeys.ts`，将 `Ctrl+Z` 撤销、`Ctrl+Shift+Z/Ctrl+Y` 重做、`Ctrl+F` 打开查询、`Delete` 清空选中单元格内容的键盘绑定抽取为 Hook，并在 `App.tsx` 用 `useHotkeys({ activeNav, onUndo: undo, onRedo: redo, onOpenQuery: openQuery, onDeleteSelectedCell: clearSelectedCellContent, selectedCellRowId: selectedCell.rowId })` 接入；新增 `src/components/PageLayout.tsx`，承载侧边栏、顶部标签与工具栏的容器布局，`App.tsx` 用 `<PageLayout sidebar={...} header={<Tabs .../>} toolbar={<Toolbar .../>}>` 包裹内容区，保持原样式与结构；`npm run test:run` 全部通过；本地预览在 `http://localhost:5176/` 正常打开（控制台出现一次 `net::ERR_ABORTED` 的模块拉取中断信息，属 HMR 刷新过程，不影响页面显示与交互）。
- [x] 节点 N20：整合视图相关 Hook 为 `useViews`；测试与预览验证。✅ 已完成 - 新增 `src/hooks/useViews.ts`，组合 `useFilterGroup`、`useViewConfig`、`useViewQuery`，对外提供 `filteredData`、`activeGroup/applyGroup`、`viewConfigMap/updateStatsAgg`、以及查询控制（`activeQuery/applyQuery/openQuery/closeQuery/queryFocusTick`）。在 `App.tsx` 删除三处独立调用与本地 `filteredData` 计算，改为调用 `useViews({...})` 并传入 `logicColumnMeta`；全量测试通过；Vite 预览在 `http://localhost:5174/` 正常，无运行时错误。