import { expect, test } from '@playwright/test';
import { gotoAuthed } from './support/auth';

test('Shell이 열리고 첫 화면으로 이동한다', async ({ page }) => {
  await gotoAuthed(page, '/');
  await expect(page).toHaveURL(/\/dev\/signals$/);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();
  await expect(page).toHaveTitle('신호 체계 확인 - MES');
});
