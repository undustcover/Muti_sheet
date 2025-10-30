# 代码重构 TodoList（apps/web）

## 节点状态
- [x] N6 粘贴头部识别弹窗 UI 验证（预览交互确认）
- [x] N8 VirtualGrid 虚拟化行为测试（性能/边界用例）
- [x] N9 修复 Toolbar.test.tsx 既有失败
- [x] N10 回归与收尾（全量测试与预览巡检）
- [x] N11 App.tsx 清理与一致性（节点 6 收尾）
- [x] N17 抽取 useHistoryState（撤销/重做与 histSet* 包装）并接入 App.tsx
- [x] N18 抽取 useFieldOps（字段新增/删除/重命名/类型变更与颜色规则联动）
- [x] N19 抽取 useSelectionEditing（选区编辑与批量填充、删除、粘贴协调）
- [x] N20 抽取 useViews（视图增删改、排序与筛选、查询词管理）
- [x] N21 抽取 useOverlays（ProtectDrawer、FieldDrawer、ConditionBuilder、QueryModal 的开关与状态）
- [ ] N22 顶部 TopBar 组件拆分（工具栏、Tabs、Breadcrumbs 归位与解耦）
- [ ] N23 App.tsx 行数目标降至 400–500 行（不改功能）

## 当前执行节点
- N22 TopBar 拆分：进行中（解耦 Tabs/Toolbar，并为后续 Breadcrumb 预留位）
  - 范围：新增 `components/topbar/HeaderTabs.tsx` 与 `components/topbar/MainToolbar.tsx` 包装组件；在 `App.tsx` 接入，移除内联 Tabs/Toolbar。
  - 目标：降低 `App.tsx` 体积（向 400–500 行靠近），维持现有 API 与视觉不变；为后续面包屑扩展预留容器位。
  - 验证：`npm run test:run` 全通过；预览端口 `5173/5174` 无报错。

## 执行者操作清单（严格）
- 每次拆分：仅抽取内联逻辑到 hook/组件，保持现有 API 与行为；不引入新功能。
- 每次变更：更新本清单对应节点的状态与说明，记录文件与影响范围。
- 每次提交前：跑 `npm run test:run` 与本地预览冒烟；若有 UI 变化，打开预览核验。

## 验收清单
- 构建通过：`pnpm -C apps/web build`。
- UI 交互稳定：选择、复制、粘贴、表头识别、列宽拖拽、冻结列粘性无回归。
- 文档同步：每次重构后更新此清单，确保与代码进度一致。

## 变更日志（最新）
- 2025-10-30：完成 N19 `useSelectionEditing` 并在 App.tsx/DataTable 接入；支持无历史包装器调度 `setData`；测试与预览通过。
- 2025-10-30：完成 N20 `useViews` 组合 Hook（`useFilterGroup` + `useViewConfig` + `useViewQuery`），App.tsx 接入并移除分散逻辑；测试与预览通过。
- 2025-10-30：完成 N21 `useOverlays`：App.tsx 全量接入；Toolbar/ConditionBuilder/ColorRulesDrawer/FieldDrawer 改用 open*/close*；恢复 FieldDrawer 完整 props；全局扫描移除内联 set*Open；保留 useOverlays.ts 内部 set* 实现与 HeaderMenu.tsx 局部状态；`npm run test:run` 通过，预览无误。
- 2025-10-30：开始 N22 TopBar 拆分：新增 `HeaderTabs/MainToolbar` 包装组件并接入 PageLayout；不更改 UI 与行为；测试与预览通过。
- 2025-10-30：完善 N18/N19：Toolbar 注入 `onCreateField` 打开 FieldDrawer；`useFieldOps` 封装选项删减数据清理；接入批量填充快捷键并在 DataTable/GridSurface 连接 `onFillKey`；测试与预览通过。
- 2025-10-30：新增 `useSelectionRange`、`useClipboard`、`useColumnResize`、`useKeyboard` 并在 DataTable 接入；移除 DataTable 内相关内联实现；构建与本地预览通过。
- 2025-10-30：开始 N17 `useHistoryState` 抽取并接入 App.tsx（进行中）。
- 2025-10-30：推进 N18/N19：FieldDrawer `onSave` 接入 `useFieldOps`；`clearSelectedCellContent` 抽取为 `useSelectionEditing`；测试与预览通过。
- N19 选区编辑：
  - 变更：新增 `src/hooks/useSelectionEditing.ts` 的批量填充与快捷键处理，`DataTable.tsx` 改为接入该 Hook 的 `onFillKey`；创建 `src/components/table/utils/selectionFill.ts` 统一填充逻辑；`useClipboard.ts` 仅保留复制/粘贴，移除冗余实现并调用工具函数。
  - 测试：`npm run test:run`，8 个测试文件、25 个用例全部通过。
  - 预览：`http://localhost:5173/` 使用 Ctrl+Enter 或 Ctrl+D 对选区进行批量填充，浏览器无错误；终端 HMR 正常。

## 变更日志
- 2025-10-30 N19：将批量填充快捷键接入 `useSelectionEditing`，`DataTable` 改线；抽取 `selectionFill.ts`，`useClipboard.ts` 复用工具函数，统一选区编辑入口。