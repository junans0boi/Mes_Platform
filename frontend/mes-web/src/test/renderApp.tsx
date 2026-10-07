import { render } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { createTestRouter } from '@/app/router/createAppRouter';
import type { RouteEntry } from '@/app/router/routeRegistry';
import type { BootstrapLoader } from '@/app/shell/bootstrap';
import type { Session } from '@/platform/auth/session';

export function Page({ name }: { name: string }) {
  return <p>{`${name} 화면`}</p>;
}

export function entry(path: string, capability: string, name: string): RouteEntry {
  return {
    meta: { path, titleKey: `shell:test.${name}`, capability, module: 'dev' },
    load: async () => ({ default: () => <Page name={name} /> }),
  };
}

export function session(overrides: Partial<Session> = {}): Session {
  return {
    userId: 1,
    userName: 'tester',
    displayName: 'Tester',
    allowedPlantIds: [1],
    capabilities: [],
    ...overrides,
  };
}

export function renderApp(options: {
  registry: RouteEntry[];
  initialPath: string;
  bootstrap?: BootstrapLoader;
  /** 기본은 registry의 모든 capability를 가진 로그인 상태다. */
  capabilities?: string[];
  /** false이면 로그인하지 않은 상태로 시작한다. */
  authenticated?: boolean;
  sessionOverrides?: Partial<Session>;
}) {
  const router = createTestRouter(options.bootstrap ?? (async () => {}), options.registry, [
    options.initialPath,
  ]);
  const initialSession =
    options.authenticated === false
      ? undefined
      : session({
          capabilities: options.capabilities ?? options.registry.map((r) => r.meta.capability),
          ...options.sessionOverrides,
        });
  const result = render(
    <AppProviders initialSession={initialSession}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, router };
}
