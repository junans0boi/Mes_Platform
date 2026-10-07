import { expect, test } from '@playwright/test';
import { ACCESS_TOKEN, gotoAuthed, mockAuthApi, submitLogin } from './support/auth';

test('로그인하지 않고 열면 로그인으로 가고, 로그인 후 원래 주소로 돌아온다', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/dev/density');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdev%2Fdensity$/);
  await submitLogin(page);
  await expect(page).toHaveURL(/\/dev\/density$/);
  await expect(page.getByRole('heading', { level: 1, name: '표 밀도 확인' })).toBeVisible();
  await expect(page.getByRole('banner').getByText('Alice Kim')).toBeVisible();
});

test('암호가 틀리면 로그인 화면에 남아 요청 번호와 함께 안내한다', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/login');
  await submitLogin(page, 'wrong');
  await expect(page.getByText(/사용자 이름 또는 암호가 올바르지 않습니다/)).toContainText('req-e2e-login');
  await expect(page).toHaveURL(/\/login$/);
});

test('token은 메모리에만 있고 storage·cookie에 남지 않으며 새로고침하면 다시 로그인한다', async ({
  page,
}) => {
  await gotoAuthed(page, '/dev/signals');
  await expect(page.getByRole('heading', { level: 1, name: '신호 체계 확인' })).toBeVisible();

  const stored = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookie: document.cookie,
  }));
  // 검사 로그: 어떤 key에도 token 값이 없다.
  console.log(
    'storage 검사',
    JSON.stringify({
      localKeys: Object.keys(stored.local),
      sessionKeys: Object.keys(stored.session),
      cookie: stored.cookie,
    }),
  );
  expect(JSON.stringify(stored)).not.toContain(ACCESS_TOKEN);
  expect((await page.context().cookies()).map((c) => c.value).join()).not.toContain(ACCESS_TOKEN);

  await page.reload();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdev%2Fsignals$/);
});

test('세션 중 401을 받으면 원래 주소를 보존해 로그인으로 이동한다', async ({ page }) => {
  await gotoAuthed(page, '/dev/signals');
  // 이후 모든 인증 요청이 401을 받는다(token 만료 상황). 화면 전환은 새 요청 없이도 일어나지 않으므로 로그아웃 대신 직접 요청한다.
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      json: {
        type: 't',
        title: 'TOKEN_EXPIRED',
        status: 401,
        code: 'TOKEN_EXPIRED',
        requestId: 'req-e2e-exp',
      },
    }),
  );
  await page.evaluate(async () => {
    // 개발 서버가 같은 module 인스턴스를 내준다. 경로를 변수로 두어 TypeScript가 앱 소스를 따라가지 않게 한다.
    const modulePath = '/src/platform/api/apiClient.ts';
    const { apiClient } = await import(/* @vite-ignore */ modulePath);
    await Promise.allSettled([
      apiClient.GET('/api/v1/auth/session'),
      apiClient.GET('/api/v1/auth/session'),
      apiClient.GET('/api/v1/auth/session'),
    ]);
  });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdev%2Fsignals$/);
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
});

test('capability가 없으면 메뉴에 없고 직접 주소로 열면 403 화면이다', async ({ page }) => {
  await gotoAuthed(page, '/dev/signals', { capabilities: ['Dev.Other.Read'] });
  await expect(page.getByText('이 화면을 볼 권한이 없습니다')).toBeVisible();
  await expect(page.getByText(/Dev\.Preview\.Read/)).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '개발 확인' }),
  ).toHaveCount(0);
});

test('Plant는 허용된 값 사이에서만 전환한다', async ({ page }) => {
  await gotoAuthed(page, '/dev/signals', { allowedPlantIds: [2, 7] });
  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: /Plant 선택: Plant 2/ }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Plant 2', 'Plant 7']);
  await page.getByRole('menuitem', { name: 'Plant 7' }).click();
  await expect(banner.getByRole('button', { name: /Plant 선택: Plant 7/ })).toBeVisible();
});
