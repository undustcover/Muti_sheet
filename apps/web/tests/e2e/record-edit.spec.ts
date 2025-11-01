import { test, expect } from '@playwright/test';

// 添加记录并编辑首行“文本”单元格
test.describe('记录编辑', () => {
  test.beforeEach(async ({ page }) => {
    // 注入本地登录状态，绕过登录页
    await page.addInitScript(() => {
      try {
        localStorage.setItem('auth.token', 'dev-token');
        localStorage.setItem('auth.user', JSON.stringify({ id: 'u-dev', name: 'Dev User' }));
      } catch {}
    });
    // 直接进入表视图，确保 DataTable 渲染（指向默认表ID）
    await page.goto('/table/tbl-1');
    // 等待表视图工具栏可见，确保页面加载完成
    await expect(page.getByRole('button', { name: '筛选' })).toBeVisible({ timeout: 60000 });
    // 等待 DataTable 渲染就绪标记
    await page.waitForSelector('[data-app-ready="1"]', { timeout: 60000 });
  });

  test('添加记录后编辑首行文本单元格', async ({ page }) => {
    // 点击工具栏“添加记录”按钮，预期在首行插入新记录
    await page.getByRole('button', { name: '添加记录' }).click();

    // 找到“文本”列的表头，获取其位置
    const textHeader = page.locator('.sheet-header-cell').filter({ hasText: '文本' });
    await expect(textHeader).toBeVisible();
    const headerBox = await textHeader.boundingBox();
    if (!headerBox) throw new Error('未找到“文本”表头');

    // 双击首行对应列，进入编辑态
    const targetX = headerBox.x + Math.max(6, Math.min(headerBox.width - 6, headerBox.width / 2));
    const targetY = headerBox.y + headerBox.height + 18; // 行高约 40，点击靠近首行中部
    await page.mouse.dblclick(targetX, targetY);

    // 在文本编辑器中输入内容（输入即写入数据）
    const input = page.locator('input.sheet-input');
    await expect(input).toBeVisible();
    await input.fill('Hello');

    // 单击同一行的“时间”列单元格以退出编辑态
    const timeHeader = page.locator('.sheet-header-cell').filter({ hasText: '时间' });
    await expect(timeHeader).toBeVisible();
    const timeHeaderBox = await timeHeader.boundingBox();
    if (!timeHeaderBox) throw new Error('未找到“时间”表头');
    const timeX = timeHeaderBox.x + Math.max(6, Math.min(timeHeaderBox.width - 6, timeHeaderBox.width / 2));
    const firstRowY = timeHeaderBox.y + timeHeaderBox.height + 18;
    await page.mouse.click(timeX, firstRowY);

    // 等编辑器关闭后再断言展示内容
    await expect(page.locator('input.sheet-input')).toHaveCount(0);

    // 断言首行“文本”单元格内容为 Hello
    // 选中该单元格后，通过可见文本进行断言
    await page.mouse.click(targetX, targetY);
    await expect(page.locator('.sheet-cell').filter({ hasText: 'Hello' }).first()).toBeVisible();
  });
});