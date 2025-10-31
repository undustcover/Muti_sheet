import { test, expect } from '@playwright/test';

// 表头菜单：隐藏/显示、排序、整列填色、编辑字段重命名

test.describe('Header menu actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-app-ready]');
  });

  test('hide field and show via toast action', async ({ page }) => {
    // 打开“文本”列的表头菜单并隐藏
    const headerCell = page.locator('.sheet-header-cell', { hasText: '文本' });
    await headerCell.getByText('▾').click();
    await page.getByText('隐藏字段', { exact: true }).click();

    // 断言出现隐藏提示 toast，并点击“显示已隐藏字段”动作按钮
    const toast = page.getByText('已隐藏部分字段', { exact: false });
    await expect(toast).toBeVisible();
    const action = page.getByRole('button', { name: '显示已隐藏字段' });
    await expect(action).toBeVisible();
    await action.click();

    // 恢复后，“文本”列再次可见
    await expect(page.locator('.sheet-header-cell', { hasText: '文本' })).toBeVisible();
  });

  test('sort asc/desc toggles indicator on header', async ({ page }) => {
    const headerCell = page.locator('.sheet-header-cell', { hasText: '序号' });
    // 升序
    await headerCell.getByText('▾').click();
    await page.getByText('升序', { exact: true }).click();
    await expect(headerCell.getByText('▲')).toBeVisible();
    // 降序
    await headerCell.getByText('▾').click();
    await page.getByText('降序', { exact: true }).click();
    await expect(headerCell.getByText('▼')).toBeVisible();
  });

  test('fill color for entire column applies cell background', async ({ page }) => {
    const headerCell = page.locator('.sheet-header-cell', { hasText: '文本' });
    await headerCell.getByText('▾').click();
    await page.getByText('整列填色', { exact: false }).hover();
    // 选择一个明确的浅红色
    await page.locator('span[title="#fee2e2"]').click();
    // 断言首行对应列的单元格存在背景色（文本列为第3个数据单元格，索引列之后）
    const firstRow = page.locator('.sheet-grid-row').first();
    const textCell = firstRow.locator('.sheet-cell').nth(3);
    await expect(textCell).toHaveCSS('background-color', 'rgb(254, 226, 226)');
  });

  test('edit field name via header menu', async ({ page }) => {
    const headerCell = page.locator('.sheet-header-cell', { hasText: '文本' });
    await headerCell.getByText('▾').click();
    await page.getByText('编辑字段').click();

    // 抽屉标题与字段名称输入
    const drawer = page.getByText('编辑字段');
    await expect(drawer).toBeVisible();
    const nameInput = page.getByLabel('字段名称');
    await nameInput.fill('文本2');
    await page.getByRole('button', { name: '保存' }).click();

    // 成功提示 & 表头名称更新
    await expect(page.getByText('字段已更新')).toBeVisible();
    await expect(page.locator('.sheet-header-cell', { hasText: '文本2' })).toBeVisible();
  });
});