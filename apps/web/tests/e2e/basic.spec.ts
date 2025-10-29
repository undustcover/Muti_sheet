import { test, expect } from '@playwright/test';

test('sidebar displays prototype label', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-app-ready]');
  await expect(page.getByText('仿飞书 · UI原型')).toBeVisible();
});