# 代码重构 Todolist（严格执行与逐节点更新）

> 原则：每完成一个节点，立即在此文档更新状态与下一步计划；严格依照此清单推进。

## 节点清单
- [x] N1 GridSurface 目录化与类型抽离（index.tsx + types.ts；`rowVirtualizer: Virtualizer`）
- [x] N2 修复运行时错误：DataTable 恢复 `Cell` 导入
- [x] N3 扩展 GridSurface 交互测试：Arrow/Enter/Tab、Ctrl+C 委托
- [x] N4 粘贴委托与“首行识别为表头”测试：`headerPrompt.show`、`applyPaste` 覆盖列头
- [x] N5 useKeyboard 防御性测试：空 `selectedCell` 初始态不触发状态修改
- [x] N6 粘贴头部识别弹窗 UI 验证（预览交互确认）
- [x] N7 useScrollSync 类型明确与测试覆盖（滚动同步与 `onSync` 调用）
- [x] N8 rowVirtualizer 性能/健壮性测试覆盖（含虚拟项变动与边界）
- [ ] N9 修复 Toolbar.test.tsx 既有失败（按钮“排序”等）
- [ ] N10 统一 clipboard 流程（GridSurface → DataTable 弹窗），整理职责与参数

## 当前状态
- 正在执行：N9 修复 Toolbar.test.tsx 既有失败

## 完成记录（最新节点）
- N8 完成：新增 `VirtualGrid.test.tsx`，覆盖以下场景：
  - 仅渲染 `virtualItems` 指定行，并断言容器 `height/minWidth`（性能最小渲染）。
  - 虚拟项变更后重新渲染对应行（动态更新健壮性）。
  - 空虚拟项边界：不渲染任何行（安全边界）。
  - 技术要点：对 `Row` 进行模块级 mock，避免 TanStack Row 结构依赖；包装 `GridStateProvider` 满足上下文依赖。
- 测试结果：3 项测试全部通过（vitest）。

## 下一步计划（当前节点）
- 进入 N9：复现并修复 `Toolbar.test.tsx` 的失败用例（排序、隐藏列等按钮交互），按以下节奏推进：
  - 运行聚焦测试：`npm run test:run -- --reporter verbose src/components/table/__tests__/Toolbar.test.tsx`
  - 分析失败日志，定位具体 DOM/回调断言不匹配的原因。
  - 仅做最小修复，保持既有行为与接口不变；必要时补单测以锁定修复。
  - 测试通过后更新此清单，切换到 N10。

## 备注
- Dev 预览：已有 `http://localhost:5175/` 可用；如涉及 UI 变更会在提交前进行预览验证。