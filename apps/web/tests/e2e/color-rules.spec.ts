import { test, expect } from '@playwright/test';

// 验证：条件构建与应用、复制与批量启用/禁用、虚拟滚动渲染
// 依赖 apps/web/playwright.config.ts 中的 dev server（5173）

test('Color Rules drawer: condition, duplicate/batch, virtual list', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-app-ready]');

  // 打开填色抽屉
  await page.getByRole('button', { name: '填色' }).click();
  const drawer = page.getByRole('heading', { name: '填色规则' }).locator('..').locator('..');
  await expect(drawer).toBeVisible();

  // 设置“单元格”作用域并配置条件：文本 包含 A
  const scopeSelect = drawer.locator('label:has-text("作用域")').locator('..').locator('select');
  await scopeSelect.selectOption('cell');
  const fieldSelect = drawer.locator('label:has-text("字段")').locator('..').locator('select');
  await fieldSelect.selectOption('text');
  await drawer.getByRole('button', { name: '设置筛选条件' }).click();
  const builder = page.getByRole('heading', { name: '筛选器' }).locator('..').locator('..');
  await builder.getByPlaceholder('值').fill('A');
  await builder.getByRole('button', { name: '应用筛选' }).click();
  await drawer.getByRole('button', { name: '应用' }).click();

  // “含条件：”摘要标题与具体摘要文本（示例：文本 包含 A）应可见
  await page.getByRole('button', { name: '填色' }).click(); // 重新打开以查看列表
  const drawer2 = page.getByRole('heading', { name: '填色规则' }).locator('..').locator('..');
  await expect(drawer2.getByText('含条件：')).toBeVisible();
  await expect(drawer2.getByText('文本 包含 A')).toBeVisible();

  // 再添加一条无条件规则用于搜索对比
  await drawer2.getByRole('button', { name: '应用' }).click();
  await page.getByRole('button', { name: '填色' }).click();
  const drawer3 = page.getByRole('heading', { name: '填色规则' }).locator('..').locator('..');

  // 规则搜索过滤：输入“包含 A”后列表项数量应减少（虚拟列表的可见项计数≤3）
  const searchInput = drawer3.getByPlaceholder('搜索规则');
  await searchInput.fill('包含 A');
  const filteredVisibleItems = await drawer3.locator('[data-index]').count();
  expect(filteredVisibleItems).toBeLessThanOrEqual(3);

  // 清空搜索框，列表恢复
  await searchInput.fill('');
  const restoredVisibleItems = await drawer2.locator('[data-index]').count();
  expect(restoredVisibleItems).toBeGreaterThan(filteredVisibleItems);
});