import { test, expect } from '@playwright/test';

// 工具栏：行高、筛选器打开、字段配置抽屉（新增/编辑）、显示隐藏字段按钮

test.describe('Toolbar actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-app-ready]');
  });

  test('row height dropdown applies sizes', async ({ page }) => {
    // 打开“行高 ▾”菜单，选择不同高度
    await page.getByRole('button', { name: '行高 ▾' }).click();
    await page.getByText('high', { exact: true }).click();
    // 等待虚拟列表重新测量
    await page.waitForTimeout(100);
    // 验证第一行容器高度（高：56）
    const firstRow = page.locator('.sheet-grid-row').first();
    await expect(firstRow).toHaveCSS('height', '56px', { timeout: 3000 });

    await page.getByRole('button', { name: '行高 ▾' }).click();
    await page.getByText('xhigh', { exact: true }).click();
    await page.waitForTimeout(100);
    await expect(firstRow).toHaveCSS('height', '72px', { timeout: 3000 });
  });

  test('open filter drawer from toolbar', async ({ page }) => {
    await page.getByRole('button', { name: '筛选' }).click();
    await expect(page.getByRole('heading', { name: '筛选器' })).toBeVisible();
    // 关闭筛选器，限定在筛选器容器内，避免与其它“关闭”按钮冲突
    const filterPanel = page.getByRole('heading', { name: '筛选器' }).locator('..').locator('..');
    await filterPanel.getByRole('button', { name: '关闭', exact: true }).click();
    // 验证抽屉已关闭（标题不可见）
    await expect(page.getByRole('heading', { name: '筛选器' })).toBeHidden();
  });

  test('field config: create and edit field from toolbar', async ({ page }) => {
    // 打开字段配置菜单
    await page.getByRole('button', { name: '字段配置 ▾', exact: true }).click();
    // 获取字段配置下拉面板容器（包含“新增字段”区块）
    const fieldMenu = page.locator('div', { has: page.getByText('新增字段', { exact: true }) });
    // 等菜单展开后点击“+ 新建”（与“+ 新建视图 ▾”区分）
    const createBtn = fieldMenu.getByRole('button', { name: '+ 新建', exact: true });
    await expect(createBtn).toBeVisible();
    // 使用事件派发避免被底层元素拦截
    await createBtn.dispatchEvent('click');
    // 选择字段类型为“单选”，添加两个选项
    await expect(page.getByText('编辑字段')).toBeVisible();
    await page.getByLabel('字段名称').fill('状态');
    await page.getByLabel('字段类型').selectOption('singleSelect');
    await page.getByPlaceholder('输入选项文本，按回车或点添加').fill('进行中');
    await page.getByRole('button', { name: '添加' }).click();
    await page.getByPlaceholder('输入选项文本，按回车或点添加').fill('完成');
    await page.getByRole('button', { name: '添加' }).click();
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('新增字段：状态')).toBeVisible();

    // 通过“···”编辑“序号”字段，切换类型为数字并设置格式
    await page.getByRole('button', { name: '字段配置 ▾', exact: true }).click();
    const fieldMenu2 = page.locator('div', { has: page.getByText('新增字段', { exact: true }) });
    const seqItem = fieldMenu2.locator('div', { hasText: /^序号/ });
    await seqItem.getByText('···').click();
    await expect(page.getByText('编辑字段')).toBeVisible();
    await page.getByLabel('字段类型').selectOption('number');
    await page.getByLabel('小数位').fill('2');
    await page.getByLabel('千分位').check();
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('字段已更新')).toBeVisible();
  });

  test('show hidden fields via toolbar button', async ({ page }) => {
    // 先通过表头隐藏一个字段以触发提示（复用表头菜单步骤）
    const headerCell = page.locator('.sheet-header-cell', { hasText: '时间' });
    await headerCell.getByText('▾').click();
    await page.getByText('隐藏字段', { exact: true }).click();
    // 避免文本歧义：toast与内联提示都包含该文案，这里取第一个匹配
    await expect(page.locator('text=已隐藏部分字段').first()).toBeVisible();

    // 使用工具栏的“显示隐藏字段”图标恢复
    await page.getByRole('button', { name: '显示隐藏字段' }).click();
    await expect(page.locator('.sheet-header-cell', { hasText: '时间' })).toBeVisible();
  });
});