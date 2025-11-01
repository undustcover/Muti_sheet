import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginAsAdmin, bootstrapStorageState } from './utils/auth';
import { createProject, createTask, createTable } from './utils/space';

test.describe('字段 CRUD 流程', () => {
  test('新增/重命名/类型切换/删除 字段', async ({ page }) => {
    const req = await playwrightRequest.newContext();
    const { token } = await loginAsAdmin(req);
    const project = await createProject(req, token);
    const task = await createTask(req, token, project.id);
    const table = await createTable(req, token, project.id, 'E2E 字段表', task.id);

    await bootstrapStorageState(page, { token, user: { id: 'e2e', email: 'admin@example.com' } });
    await page.goto(`/table/${table.id}`);
    await page.waitForSelector('[data-app-ready="1"]');

    // 打开工具栏“字段配置 ▾”，通过“+ 新建”新增字段
    await page.getByRole('button', { name: '字段配置 ▾', exact: true }).click();
    const fieldMenu = page.locator('div', { has: page.getByText('新增字段', { exact: true }) });
    const createBtn = fieldMenu.getByRole('button', { name: '+ 新建', exact: true });
    await expect(createBtn).toBeVisible();
    await createBtn.dispatchEvent('click');

    // FieldDrawer 出现，填入字段信息
    // FieldDrawer 出现，填入字段信息
    await page.getByLabel(/字段名|名称/).fill('E2E_字段');
    await page.getByLabel(/字段类型|类型/).selectOption('text');
    await page.getByRole('button', { name: '保存', exact: true }).click();

    // 验证表头中出现该字段（限定在列头容器，避免与 toast 重复匹配）
    const headerCellForNewField = page.locator('.sheet-header-cell', { hasText: 'E2E_字段' });
    await expect(headerCellForNewField).toBeVisible();

    // 重命名字段：从表头菜单打开“编辑字段”
    const headerCellForRename = page.locator('.sheet-header-cell', { hasText: 'E2E_字段' });
    await headerCellForRename.getByRole('button', { name: '▾' }).click();
    await page.getByText('编辑字段', { exact: true }).click();
    await page.getByLabel('字段名称').fill('E2E_字段_重命名');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.locator('.sheet-header-cell', { hasText: 'E2E_字段_重命名' })).toBeVisible();

    // 类型切换：从表头菜单打开“编辑字段”，切换到数字类型
    const headerCellForType = page.locator('.sheet-header-cell', { hasText: 'E2E_字段_重命名' });
    await headerCellForType.getByRole('button', { name: '▾' }).click();
    await page.getByText('编辑字段', { exact: true }).click();
    await page.getByLabel('字段类型').selectOption('number');
    await page.getByRole('button', { name: '保存', exact: true }).click();

    // 删除字段：打开菜单 -> 删除字段
    const headerCell = page.locator('.sheet-header-cell', { hasText: 'E2E_字段_重命名' });
    await headerCell.getByText('▾').click();
    await page.getByText('删除字段', { exact: true }).click();
    await expect(page.getByText('E2E_字段_重命名')).toHaveCount(0);
  });
});