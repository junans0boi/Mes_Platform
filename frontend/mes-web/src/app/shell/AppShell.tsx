import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import type { RouteEntry } from '../router/routeRegistry';
import { Beacon } from './Beacon';
import { BootState } from './BootState';
import { ShellIdentity } from './ShellIdentity';
import { ShellProvider } from './ShellProvider';
import { TopBar } from './TopBar';
import { WorkspaceTabs } from './WorkspaceTabs';
import { useBootstrap, type BootstrapLoader } from './bootstrap';
import { useWorkspaceTabs } from './useWorkspaceTabs';

export interface AppShellProps {
  registry: RouteEntry[];
  bootstrap: BootstrapLoader;
}

// 경광선 → 상단 한 줄 → (열린 화면) → 작업 영역. 좌측 레일이 없어 작업 영역이 폭 전체를 쓴다.
export function AppShell({ registry, bootstrap }: AppShellProps) {
  const theme = useTheme();
  const { t } = useTranslation(['shell', 'dev']);
  const location = useLocation();
  const boot = useBootstrap(bootstrap);
  const { tabs, activePath, close } = useWorkspaceTabs(registry);

  useEffect(() => {
    const entry = registry.find((r) => r.meta.path === location.pathname);
    const title = entry ? t(entry.meta.titleKey, { defaultValue: entry.meta.path }) : null;
    document.title = title ? `${title} - ${t('shell:appName')}` : t('shell:appName');
  }, [location.pathname, registry, t]);

  return (
    <ShellProvider>
      <ShellIdentity />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 0,
          backgroundColor: theme.mes.surface,
        }}
      >
        <Box
          component="a"
          href="#main"
          sx={{
            position: 'absolute',
            left: 8,
            top: -48,
            zIndex: 2000,
            p: 1,
            backgroundColor: theme.mes.accent,
            color: theme.mes.accentContrast,
            '&:focus': { top: 8 },
          }}
        >
          {t('shell:skipToContent')}
        </Box>
        <Beacon />
        <TopBar registry={registry} />
        <WorkspaceTabs tabs={tabs} activePath={activePath} onClose={close} />
        <Box
          component="main"
          id="main"
          tabIndex={-1}
          sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', outline: 'none' }}
        >
          {boot.status === 'ready' ? <Outlet /> : <BootState boot={boot} />}
        </Box>
      </Box>
    </ShellProvider>
  );
}
