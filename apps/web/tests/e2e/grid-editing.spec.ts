import { test, expect } from '@playwright/test';

// 网格：选择与编辑单元格（文本编辑器），复制提示可见性

test.describe('Grid editing interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-app-ready]');
  });

  test('double-click cell enters edit mode and saves text', async ({ page }) => {
    const firstRow = page.locator('.sheet-grid-row').first();
    // 文本列为第3个数据单元格（索引列之后）
    const textCell = firstRow.locator('.sheet-cell').nth(3);
    await textCell.dblclick();
    const input = page.locator('input.sheet-input');
    await expect(input).toBeVisible();
    await input.fill('Hello');
    // 点击其他位置退出编辑（例如点击首行索引单元格）
    const indexCell = firstRow.locator('.sheet-cell').first();
    await indexCell.click();
    // 编辑器消失，显示文本
    await expect(page.locator('input.sheet-input')).toHaveCount(0);
    await expect(textCell).toHaveText('Hello');
  });

  test('copy selection shows copy toast', async ({ page }) => {
    const firstRow = page.locator('.sheet-grid-row').first();
    const textCell = firstRow.locator('.sheet-cell').nth(3);
    await textCell.click();
    // 组合键：Ctrl+C（Windows）
    await page.keyboard.press('Control+C');
    // 复制提示：已复制 N 个单元格
    const toast = page.getByText('已复制', { exact: false });
    await expect(toast).toBeVisible();
  });
});