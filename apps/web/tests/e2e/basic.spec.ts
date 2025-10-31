import { test, expect } from '@playwright/test';

test('app renders tabs and table ready', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-app-ready]');
  // 验证顶部标签存在（默认视图名：主数据表）
  await expect(page.getByText('主数据表')).toBeVisible();
  // 验证工具栏常用入口可见（筛选/排序/填色）
  await expect(page.getByRole('button', { name: '筛选' })).toBeVisible();
  await expect(page.getByRole('button', { name: '排序' })).toBeVisible();
  await expect(page.getByRole('button', { name: '填色' })).toBeVisible();
});