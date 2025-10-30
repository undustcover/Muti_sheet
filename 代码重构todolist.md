# 代码重构 Todolist（严格执行与逐节点更新）

目标：将以下超长文件按职责拆分，降低耦合、提高可维护性，并确保每步完成后功能无回归。
- `apps/web/src/App.tsx`
- `apps/web/src/components/DataTable.tsx`

## 原则
- 按里程碑逐步实施，每个节点完成后必须更新本文件的进度与完成记录，不删除任何既有条目。
- 保持行为不变：每次改动后在 `http://localhost:5173/` 预览验证（表头对齐、滚动同步、冻结列、列宽、筛选/查询、导入导出、颜色规则）。
- 颗粒度控制：单文件 150–300 行为宜；优先抽纯函数与独立视图子块，再抽交互 Hook。
- 变更最小化：保持既有 props/状态命名；必要时加适配层。

## 目录规划（目标形态）
- `apps/web/src/pages/TablePage.tsx`：页面容器（组合 Toolbar、QueryModal、DataTable 与状态）。
- `apps/web/src/components/table/`
  - `Header.tsx`：表头渲染与列宽模板、排序/菜单入口。
  - `VirtualGrid.tsx`：虚拟滚动容器、`gridTemplateColumns`、行复用。
  - `Row.tsx`：单行渲染（行高、选中态、颜色规则）。
  - `Cell.tsx`：单元格渲染与编辑入口，类型驱动。
  - `index.ts`：组件出口。
- `apps/web/src/components/table/hooks/`
  - `useColumnResize.ts`、`useSelection.ts`、`useKeyboard.ts`、`useScrollSync.ts`。
- `apps/web/src/components/table/utils/`
  - `columns.ts`（`getColWidth`、列模板生成、冻结列计算）。
  - `rows.ts`（行样式、行 key、颜色规则匹配）。
  - `index.ts`：工具出口。
- `apps/web/src/hooks/`
  - `useTableState.ts`：表格状态（列元数据、可见性、行高、筛选、颜色规则、查询等）。
- `apps/web/src/utils/`
  - `data.ts`：mock 数据生成、初始列元数据合并等。
- `apps/web/src/types/`：`ColumnItem`、`RowItem`、颜色规则、查询条件等类型。

## 里程碑与任务

### M0：准备与边界梳理
- [ ] 标注 `App.tsx` 与 `DataTable.tsx` 现有职责与耦合点（滚动、列宽、选择、编辑、筛选/颜色）。
- [ ] 确认抽象边界与导出接口（props、回调、context）。
- 交付物：边界笔记（附于本文件下方「进度日志」）。
- 状态：未开始

### M1：抽取工具函数（不改行为）
- [ ] 从 `DataTable.tsx` 拆出：`getColWidth`、列模板生成、行样式函数 → `components/table/utils/{columns.ts, rows.ts}`。
- [ ] 从 `App.tsx` 拆出：mock 数据生成与初始列元数据合并 → `utils/data.ts`。
- [ ] 为工具添加最小单测（列宽、模板生成）。
- 交付物：工具文件、通过预览验证。
- 状态：未开始

### M2：拆分视图子组件（装配层保留）
- [ ] 将表头、虚拟网格、行、单元格分别抽为 `Header.tsx`、`VirtualGrid.tsx`、`Row.tsx`、`Cell.tsx`。
- [ ] `DataTable.tsx` 收敛为装配层，透传必要 props 与回调。
- 交付物：子组件文件与 `DataTable.tsx` 装配层。
- 状态：未开始

### M3：提取交互 Hook
- [ ] 抽 `useColumnResize`（持久化列宽）。
- [ ] 抽 `useSelection`（单/多选、框选）。
- [ ] 抽 `useKeyboard`（方向键、Enter、编辑模式切换）。
- [ ] 抽 `useScrollSync`（头部/主体滚动同步）。
- 交付物：hooks 文件；交互不变。
- 状态：未开始

### M4：页面装配与状态外移
- [ ] 从 `App.tsx` 抽 `useTableState.ts`，保留 `App.tsx` 为入口。
- [ ] 新建 `pages/TablePage.tsx` 组合 Toolbar、QueryModal、DataTable 与状态。
- [ ] `App.tsx` 简化为路由/入口转发或直接渲染 `TablePage`。
- 交付物：`TablePage.tsx`、`useTableState.ts`。
- 状态：未开始

### M5：出口与路径清理
- [ ] 添加 `index.ts`（components/table、utils）barrel，统一 import 路径。
- [ ] 清理相对路径与重复导入。
- 交付物：统一出口与稳定 import。
- 状态：未开始

### M6：基础测试与回归验证
- [ ] 单测：列宽计算、行渲染（行高/颜色规则）、筛选输出、滚动同步核心。
- [ ] 预览验证：交互串测（冻结列、拖拽宽度、筛选/查询、导入/导出、颜色规则）。
- 交付物：测试用例与通过记录。
- 状态：未开始

## 验收标准
- 代码分层清晰，文件职责单一，复杂度显著下降（单文件 < 400 行，核心子块 150–300 行）。
- 所有既有功能在预览与测试均无回归。
- 新增 hooks/utils 可复用，后续功能变更主要在局部。

## 更新规范（每次节点完成必做）
- 在对应里程碑勾选完成，并填写「完成时间」。
- 在「进度日志」追加一条记录：时间、节点名、涉及文件、关键改动、验证结果（预览/测试）。
- 不删除本文件任何既有条目；只追加与更新进度。

---

## 进度日志（按时间倒序追加）
- YYYY-MM-DD HH:mm｜M? 完成：涉及文件：[...]；改动摘要：...；验证：预览通过/测试通过。