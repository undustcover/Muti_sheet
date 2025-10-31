import { test, expect } from '@playwright/test';

// Tabs 操作与保护抽屉的端到端验证
// 场景涵盖：重命名、复制、删除、保护视图抽屉、+新建视图下拉、新增查询页

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-app-ready]');
});

// 重命名当前激活的主数据表视图
test('rename active tab via menu', async ({ page }) => {
  await expect(page.getByText('主数据表')).toBeVisible();
  // 打开激活标签的三点菜单（激活标签才显示 ···）
  await page.getByText('···').click();
  await page.getByText('重命名').click();
  // 输入框出现，进行重命名
  const input = page.locator('input[value="主数据表"]');
  await input.fill('主数据表-重命名');
  // 通过点击其他位置触发 blur（保存）
  await page.getByRole('button', { name: '+ 新建视图 ▾' }).click();
  await expect(page.getByText('主数据表-重命名')).toBeVisible();
});

// 复制视图后生成 “副本”，并可删除
test('duplicate and delete a view', async ({ page }) => {
  // 确保菜单可见并复制
  await page.getByText('···').click();
  await page.getByText('复制视图').click();
  await expect(page.getByText(/副本$/)).toBeVisible();

  // 切换到副本标签，再删除它
  const dupTab = page.getByText(/主数据表.*副本/);
  await dupTab.click();
  // 打开副本标签菜单并删除
  await page.getByText('···').click();
  await page.getByText('删除视图').click();
  await expect(page.getByText(/副本$/)).toHaveCount(0);
});

// 保护视图抽屉出现并展示保护选项
test('open protect drawer from tab menu', async ({ page }) => {
  await page.getByText('···').click();
  await page.getByText('保护视图').click();
  // 抽屉出现后，应能看到三种保护模式
  await expect(page.getByText('公共视图')).toBeVisible();
  await expect(page.getByText('锁定视图')).toBeVisible();
  await expect(page.getByText('个人视图')).toBeVisible();
});

// 通过 + 新建视图 下拉新增查询页，并自动激活
test('add a new query view via + button', async ({ page }) => {
  await page.getByRole('button', { name: '+ 新建视图 ▾' }).click();
  await page.getByText('查询页视图').click();
  // 新增后的默认名称：查询页 <序号>
  await expect(page.getByText(/查询页 \d+/)).toBeVisible();
});