import { render } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { createTestRouter } from '@/app/router/createAppRouter';
import type { RouteEntry } from '@/app/router/routeRegistry';
import type { BootstrapLoader } from '@/app/shell/bootstrap';
import { CapabilityContext, type CapabilitySource } from '@/platform/authorization/capabilities';

export function Page({ name }: { name: string }) {
  return <p>{`${name} 화면`}</p>;
}

export function entry(path: string, capability: string, name: string): RouteEntry {
  return {
    meta: { path, titleKey: `shell:test.${name}`, capability, module: 'dev' },
    load: async () => ({ default: () => <Page name={name} /> }),
  };
}

export function renderApp(options: {
  registry: RouteEntry[];
  initialPath: string;
  bootstrap?: BootstrapLoader;
  capabilities?: CapabilitySource;
}) {
  const router = createTestRouter(options.bootstrap ?? (async () => {}), options.registry, [
    options.initialPath,
  ]);
  const tree = (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
  return render(
    options.capabilities ? (
      <CapabilityContext.Provider value={options.capabilities}>{tree}</CapabilityContext.Provider>
    ) : (
      tree
    ),
  );
}
