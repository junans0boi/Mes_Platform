import { expect, test } from '@playwright/test';

test('임시 route는 방문할 때만 각각 별도 모듈로 로딩된다', async ({ page }) => {
  const loaded: string[] = [];
  page.on('request', (r) => {
    const m = /\/modules\/dev\/(\w+)\.tsx/.exec(r.url());
    if (m) loaded.push(m[1]!);
  });
  await page.goto('/dev/signals');
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();
  expect(loaded).toContain('SignalsPreviewPage');
  expect(loaded).not.toContain('DensityPreviewPage');

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '개발 확인' }).click();
  await page.getByRole('menuitem', { name: '표 밀도 확인' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '표 밀도 확인' })).toBeVisible();
  expect(loaded).toContain('DensityPreviewPage');
  await expect(page.getByRole('navigation', { name: '열린 화면' }).getByRole('link')).toHaveCount(2);
});

test('부트스트랩 실패 시 Shell 골격 위에 재시도가 나오고 재시도하면 복구된다', async ({ page }) => {
  await page.goto('/dev/signals?__boot=fail-once');
  await expect(page.getByText('시작 정보를 불러오지 못했습니다')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
  await expect(page.getByText(/req-test-0001/)).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();
});

test('예외 리본은 상태 필터를 걸고 다시 누르면 해제한다', async ({ page }) => {
  await page.goto('/dev/signals');
  const ribbon = page.getByRole('group', { name: '상태별 건수' });
  await ribbon.getByRole('button', { name: /이상/ }).click();
  await expect(page.getByText('선택한 상태: 이상')).toBeVisible();
  await ribbon.getByRole('button', { name: /이상/ }).click();
  await expect(page.getByText('선택한 상태가 없습니다')).toBeVisible();
});

test('키보드만으로 본문으로 건너뛸 수 있다', async ({ page }) => {
  await page.goto('/dev/signals');
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '본문으로 이동' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('1366×768에서 페이지가 스크롤되지 않는다', async ({ page }) => {
  await page.goto('/dev/density');
  await expect(page.getByRole('heading', { level: 1, name: '표 밀도 확인' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  expect(overflow).toBe(false);
});

test('언어를 바꾸면 Shell 문구가 바뀐다', async ({ page }) => {
  await page.goto('/dev/signals');
  await page.getByRole('button', { name: '표시 설정' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  // 설정 팝오버가 열려 있는 동안 뒤쪽 화면은 보조 기술에서 숨겨진다.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible();
  // dev namespace는 ko만 있으므로 화면 본문은 ko로 대체된다.
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();
});

test('경광선과 상단 한 줄은 상태에 따라 같은 의미를 색·도형·글자로 알린다', async ({ page }) => {
  await page.goto('/dev/signals');
  const beacon = page.locator('[data-beacon]');
  const bar = page.getByRole('banner');

  await page.getByRole('button', { name: '정상 상태' }).click();
  await expect(beacon).toHaveAttribute('data-beacon', 'normal');
  await expect(bar.getByText(/^이상 \d/)).toHaveCount(0);

  await page.getByRole('button', { name: '지연 있음' }).click();
  await expect(beacon).toHaveAttribute('data-beacon', 'delayed');
  await expect(bar.getByText('지연 12')).toBeVisible();

  await page.getByRole('button', { name: '이상 있음' }).click();
  await expect(beacon).toHaveAttribute('data-beacon', 'fault');
  await expect(bar.getByText('이상 3')).toBeVisible();

  await page.getByRole('button', { name: '연결 끊김' }).click();
  await expect(bar.getByRole('alert')).toContainText('끊김');
  await expect(bar.getByText(/마지막 기준/)).toBeVisible();
});
