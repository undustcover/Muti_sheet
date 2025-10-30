# Changelog

## 0.0.16 (2025-10-30)

- Excel 导入优化：导入时创建全新数据表，不再覆盖当前表。
- 新表使用 Excel 文件名命名，便于侧栏识别与切换。
- 导入完成后自动切换到新建表，提升导入体验与可见性。
- 修复导入错误：`nextData` 使用前未定义的初始化顺序问题。

相关变更涉及：`apps/web/src/App.tsx`、`apps/web/src/components/Sidebar.tsx`、`apps/web/src/components/topbar/MainToolbar.tsx`。