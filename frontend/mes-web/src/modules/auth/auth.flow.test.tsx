import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { apiClient } from '@/platform/api/apiClient';
import { tokenStore } from '@/platform/auth/tokenStore';
import { unauthorizedBus } from '@/platform/auth/unauthorizedBus';
import { sampleProblem, sampleSuccessBody } from '@/test/contractMock';
import { server } from '@/test/mswServer';
import { entry, renderApp } from '@/test/renderApp';
import type { RouteEntry } from '@/app/router/routeRegistry';

const SECRET = 'secret-access-token-0123456789';

const A = entry('/dev/a', 'Dev.A.Read', 'a');
const registry: RouteEntry[] = [A, entry('/dev/b', 'Dev.B.Read', 'b')];

function mockLogin() {
  const login = sampleSuccessBody('login') as { data: Record<string, unknown> };
  const session = sampleSuccessBody('getSession') as { data: Record<string, unknown> };
  server.use(
    http.post('*/api/v1/auth/login', () =>
      HttpResponse.json({ ...login, data: { ...login.data, accessToken: SECRET } }),
    ),
    http.get('*/api/v1/auth/session', ({ request }) =>
      request.headers.get('Authorization') === `Bearer ${SECRET}`
        ? HttpResponse.json({
            ...session,
            data: {
              ...session.data,
              userName: 'alice',
              displayName: 'Alice',
              allowedPlantIds: [1, 2],
              capabilities: ['Dev.A.Read'],
            },
          })
        : HttpResponse.json(sampleProblem(401, { code: 'AUTHENTICATION_REQUIRED' }), { status: 401 }),
    ),
  );
}

async function signIn(userName = 'alice', password = 'pw') {
  await userEvent.type(await screen.findByLabelText(/사용자 이름/), userName);
  await userEvent.type(screen.getByLabelText(/암호/), password);
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
}

beforeEach(() => {
  tokenStore.clear();
  unauthorizedBus.rearm();
  localStorage.clear();
  sessionStorage.clear();
});

describe('로그인과 원래 주소 복귀', () => {
  it('로그인하지 않으면 현재 주소를 보존해 로그인 화면으로 보낸다', async () => {
    const { router } = renderApp({ registry, initialPath: '/dev/a?tab=2', authenticated: false });
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(new URLSearchParams(router.state.location.search).get('returnTo')).toBe('/dev/a?tab=2');
  });

  it('로그인하면 원래 주소로 돌아가고 세션의 사용자·Plant가 상단에 보인다', async () => {
    mockLogin();
    const { router } = renderApp({ registry, initialPath: '/dev/a?tab=2', authenticated: false });
    await signIn();
    expect(await screen.findByText('a 화면')).toBeInTheDocument();
    expect(router.state.location.pathname + router.state.location.search).toBe('/dev/a?tab=2');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Alice')).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: /Plant 선택: Plant 1/ })).toBeInTheDocument();
  });

  it('자격 증명이 틀리면 화면에 남아 안내하고 token을 만들지 않는다', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(sampleProblem(401, { code: 'INVALID_CREDENTIALS', requestId: 'req-login-1' }), {
          status: 401,
        }),
      ),
    );
    const { router } = renderApp({ registry, initialPath: '/dev/a', authenticated: false });
    await signIn('alice', 'wrong');
    const alert = await screen.findByText(/사용자 이름 또는 암호가 올바르지 않습니다/);
    expect(alert).toHaveTextContent('req-login-1');
    expect(router.state.location.pathname).toBe('/login');
    expect(tokenStore.get()).toBeNull();
  });

  it('빈 입력은 서버를 부르지 않고 필드 오류를 보여준다', async () => {
    let called = false;
    server.use(
      http.post('*/api/v1/auth/login', () => {
        called = true;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderApp({ registry, initialPath: '/login', authenticated: false });
    await userEvent.click(await screen.findByRole('button', { name: '로그인' }));
    expect(screen.getAllByText('필수 항목입니다')).toHaveLength(2);
    expect(called).toBe(false);
  });

  it('이미 로그인했으면 로그인 화면에서 returnTo로 보낸다', async () => {
    const { router } = renderApp({ registry, initialPath: '/login?returnTo=%2Fdev%2Fa' });
    expect(await screen.findByText('a 화면')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dev/a');
  });

  it('외부 주소 returnTo는 무시하고 첫 화면으로 보낸다', async () => {
    mockLogin();
    const { router } = renderApp({
      registry,
      initialPath: `/login?returnTo=${encodeURIComponent('https://evil.example/x')}`,
      authenticated: false,
    });
    await signIn();
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/login'));
    expect(router.state.location.pathname).not.toContain('evil');
  });
});

describe('token은 메모리에만 있다', () => {
  it('로그인 뒤 token은 tokenStore에만 있고 storage·cookie에는 어떤 형태로도 없다', async () => {
    mockLogin();
    renderApp({ registry, initialPath: '/dev/a', authenticated: false });
    await signIn();
    await screen.findByText('a 화면');

    expect(tokenStore.get()).toBe(SECRET);
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i)!;
        expect(key).not.toMatch(/token|auth|session/i);
        expect(storage.getItem(key)).not.toContain(SECRET);
      }
    }
    expect(document.cookie).not.toContain(SECRET);
  });

  it('로그아웃하면 token을 지우고 로그인으로 보내며 서버 상태 cache도 지운다', async () => {
    mockLogin();
    const { router } = renderApp({ registry, initialPath: '/dev/a', authenticated: false });
    await signIn();
    await screen.findByText('a 화면');
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(router.state.location.search).toContain('returnTo=%2Fdev%2Fa');
  });
});

describe('401 공통 처리', () => {
  function Probe401({ count }: { count: number }) {
    useEffect(() => {
      for (let i = 0; i < count; i += 1) void apiClient.GET('/api/v1/auth/session').catch(() => {});
    }, [count]);
    return <p>probe</p>;
  }

  it('세션 중 401을 받으면 로그인으로 이동하고 원래 주소를 보존하며, 동시 401은 한 번만 처리한다', async () => {
    server.use(
      http.get('*/api/v1/auth/session', () =>
        HttpResponse.json(sampleProblem(401, { code: 'TOKEN_EXPIRED' }), { status: 401 }),
      ),
    );
    let reports = 0;
    const off = unauthorizedBus.subscribe(() => {
      reports += 1;
    });
    const probe: RouteEntry = { ...A, load: async () => ({ default: () => <Probe401 count={5} /> }) };
    const { router } = renderApp({ registry: [probe], initialPath: '/dev/a?x=1' });
    tokenStore.set('stale');

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    off();
    expect(reports).toBe(1);
    expect(tokenStore.get()).toBeNull();
    expect(new URLSearchParams(router.state.location.search).get('returnTo')).toBe('/dev/a?x=1');
  });

  it('로그인 요청 자체의 401(자격 증명 오류)은 세션 종료로 취급하지 않는다', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(sampleProblem(401, { code: 'INVALID_CREDENTIALS' }), { status: 401 }),
      ),
    );
    let reports = 0;
    const off = unauthorizedBus.subscribe(() => {
      reports += 1;
    });
    renderApp({ registry, initialPath: '/login', authenticated: false });
    await signIn('a', 'b');
    await screen.findByText(/사용자 이름 또는 암호가 올바르지 않습니다/);
    off();
    expect(reports).toBe(0);
  });

  it('세션이 끝나면 이전 사용자의 서버 상태 cache를 비운다', async () => {
    const clear = vi.spyOn(QueryClient.prototype, 'clear');
    server.use(
      http.get('*/api/v1/auth/session', () =>
        HttpResponse.json(sampleProblem(401, { code: 'TOKEN_EXPIRED' }), { status: 401 }),
      ),
    );
    const probe: RouteEntry = { ...A, load: async () => ({ default: () => <Probe401 count={1} /> }) };
    renderApp({ registry: [probe], initialPath: '/dev/a' });
    await screen.findByRole('heading', { name: '로그인' });
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});

describe('capability guard', () => {
  it('로그인 세션의 capability로 메뉴를 거르고 직접 URL은 403 화면이다', async () => {
    renderApp({ registry, initialPath: '/dev/b', capabilities: ['Dev.A.Read'] });
    expect(await screen.findByText('이 화면을 볼 권한이 없습니다')).toBeInTheDocument();
    expect(screen.getByText(/Dev\.B\.Read/)).toBeInTheDocument();
  });

  it('capability가 하나도 없으면 모든 화면이 403이다', async () => {
    renderApp({ registry, initialPath: '/dev/a', capabilities: [] });
    expect(await screen.findByText('이 화면을 볼 권한이 없습니다')).toBeInTheDocument();
  });
});
