# 代码重构 TodoList（apps/web）

## 已完成
- 清理 DataTable 未使用的状态：移除 `setIndexColWidth`，保留 `indexColWidth` 值。
- 修复 Row 聚焦：将 `focusGrid={() => focusGrid()}` 改为 `parentRef.current?.focus()`。
- Toolbar 未用参数重命名：`activeQuery` → `_activeQuery`，`onApplyQuery` → `_onApplyQuery`。
- App.tsx 清理未使用变量：删除 `mockUsers`、`deleteSelectedRow`、`firstVisibleId` 与 `setColumnVisibility` 回调中的 `prev` 参数。
- DataTable.tsx 清理未使用导入：移除 `flexRender`、`HeaderMenu`、`isFirstVisibleField`、`makeIndexHeaderStyle`。
- App.tsx 清理未使用类型导入：移除 `User`、`FormulaConfig`、`NumberFormat`。
- 生产构建通过（vite + tsc）。
- 抽离剪贴板逻辑为独立 hook：新增 `useClipboard`，集中 `Ctrl+C` 复制、`onPaste` 粘贴、表头识别弹窗、复制数量提示、全局 copy 事件；在 DataTable 接入并移除内联实现。
- 抽离选区与拖拽逻辑为独立 hook：新增 `useSelectionRange`，统一维护 `selectionRange`、`isInRange` 与 `isDragging`，DataTable 接入并下传给 Row。
- 抽离列宽拖拽逻辑为独立 hook：新增 `useColumnResize`，管理 `startResize` 与 `hoverResizeCid`，在 DataTable 接入并传递给 Header 与 Row；构建验证通过。
- 抽离键盘导航与编辑切换为独立 hook：新增 `useKeyboard`，统一方向键/Enter/Tab 与复制触发，DataTable 接入并移除内联实现；构建与预览验证通过。

## 进行中 / 待办
- Grid 状态解耦：尝试引入轻量 context（如 `GridStateContext`），集中 `selectedCell`、`editingCell`、`selectionRange` 等共享状态，简化跨组件传参。
- 单元测试补齐：为剪贴板解析（数字/日期/时间）与粘贴扩列/重命名逻辑添加测试用例（vitest）。
- 性能优化：为 Row 与 Cell 组件增加必要的 memo 化，减少不必要重渲染；关注虚拟滚动与粘性列计算的热路径。

## 验收清单
- 构建通过：`pnpm -C apps/web build`。
- UI交互稳定：选择、复制、粘贴、表头识别、列宽拖拽、冻结列粘性无回归。
- 文档同步：每次重构后更新此清单，确保与代码进度一致。

## 变更日志（最新）
- 2025-10-30：新增 `useSelectionRange`、`useClipboard`、`useColumnResize`、`useKeyboard` 并在 DataTable 接入；移除 DataTable 内相关内联实现；构建与本地预览通过。