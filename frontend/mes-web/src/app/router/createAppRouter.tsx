import type { ComponentType } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { useCapabilities } from '@/platform/authorization/capabilities';
import { AccessDenied, InitialLoading, NotFound, RouteError } from '../shell/RouteStates';
import { AppShell } from '../shell/AppShell';
import type { BootstrapLoader } from '../shell/bootstrap';
import { homePath, routeRegistry, type RouteEntry } from './routeRegistry';

function guard(entry: RouteEntry, Page: ComponentType): ComponentType {
  return function GuardedPage() {
    const { has } = useCapabilities();
    return has(entry.meta.capability) ? <Page /> : <AccessDenied capability={entry.meta.capability} />;
  };
}

function toRoutes(registry: RouteEntry[], bootstrap: BootstrapLoader): RouteObject[] {
  return [
    {
      path: '/',
      element: <AppShell registry={registry} bootstrap={bootstrap} />,
      errorElement: <RouteError />,
      // 첫 화면 chunk를 불러오는 동안 보여준다(Shell 골격이 준비되기 전의 짧은 순간).
      hydrateFallbackElement: <InitialLoading />,
      children: [
        { index: true, element: <Navigate to={homePath} replace /> },
        ...registry.map<RouteObject>((entry) => ({
          path: entry.meta.path.slice(1),
          errorElement: <RouteError />,
          lazy: async () => ({ Component: guard(entry, (await entry.load()).default) }),
        })),
        { path: '*', element: <NotFound /> },
      ],
    },
  ];
}

export function createAppRouter(bootstrap: BootstrapLoader, registry: RouteEntry[] = routeRegistry) {
  return createBrowserRouter(toRoutes(registry, bootstrap));
}

export function createTestRouter(
  bootstrap: BootstrapLoader,
  registry: RouteEntry[],
  initialEntries: string[],
) {
  return createMemoryRouter(toRoutes(registry, bootstrap), { initialEntries });
}
