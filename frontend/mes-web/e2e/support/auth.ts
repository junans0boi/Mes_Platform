import { expect, type Page } from '@playwright/test';

export const ACCESS_TOKEN = 'e2e-access-token-0123456789';

interface MockOptions {
  capabilities?: string[];
  allowedPlantIds?: number[];
}

const meta = { requestId: '00000000-0000-4000-8000-000000000001', operationId: null };

// 백엔드 없이 인증 계약(CON-01)의 login·session 응답을 흉내 낸다. 응답 모양은 contracts/openapi.yaml을 따른다.
export async function mockAuthApi(page: Page, options: MockOptions = {}) {
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { userName: string; password: string };
    if (body.password === 'wrong') {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        json: {
          type: 'https://mes.internal/errors/invalid-credentials',
          title: 'INVALID_CREDENTIALS',
          status: 401,
          code: 'INVALID_CREDENTIALS',
          requestId: 'req-e2e-login',
        },
      });
      return;
    }
    await route.fulfill({
      json: { data: { accessToken: ACCESS_TOKEN, tokenType: 'Bearer', expiresInSeconds: 900 }, meta },
    });
  });
  await page.route('**/api/v1/auth/session', async (route) => {
    if (route.request().headers().authorization !== `Bearer ${ACCESS_TOKEN}`) {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        json: {
          type: 't',
          title: 'AUTHENTICATION_REQUIRED',
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          requestId: 'req-e2e-401',
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          userId: 1001,
          userName: 'alice',
          displayName: 'Alice Kim',
          allowedPlantIds: options.allowedPlantIds ?? [1, 2],
          capabilities: options.capabilities ?? ['Dev.Preview.Read'],
        },
        meta,
      },
    });
  });
}

export async function submitLogin(page: Page, password = 'pw') {
  await page.getByLabel('사용자 이름').fill('alice');
  await page.getByLabel('암호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

// 새로고침하면 메모리 token이 사라지므로(개발 중 한계) 화면마다 로그인을 거쳐 원래 주소로 들어간다.
export async function gotoAuthed(page: Page, path: string, options: MockOptions = {}) {
  await mockAuthApi(page, options);
  await page.goto(`/login?returnTo=${encodeURIComponent(path)}`);
  await submitLogin(page);
  await expect(page.getByRole('heading', { name: '로그인' })).toHaveCount(0);
}
