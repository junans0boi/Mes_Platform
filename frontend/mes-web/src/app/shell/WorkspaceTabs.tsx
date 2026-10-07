import Close from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { WorkspaceTab } from './useWorkspaceTabs';

// 열린 화면 목록. 화면이 하나뿐이면 제목 줄이 같은 정보를 주므로 나타나지 않는다.
export function WorkspaceTabs({
  tabs,
  activePath,
  onClose,
}: {
  tabs: WorkspaceTab[];
  activePath: string;
  onClose: (path: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation(['shell', 'dev']);
  if (tabs.length < 2) return null;
  return (
    <Box
      component="nav"
      aria-label={t('shell:tabs.label')}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        height: theme.mes.layout.tabsHeight,
        px: `${theme.mes.layout.pagePaddingX}px`,
        gap: 2.5,
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        const title = t(tab.titleKey, { defaultValue: tab.path });
        return (
          <Box
            key={tab.path}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              boxShadow: active ? `inset 0 -3px 0 ${theme.mes.accent}` : 'none',
            }}
          >
            <NavLink
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              style={{
                color: active ? theme.mes.ink : theme.mes.inkMuted,
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </NavLink>
            <IconButton
              size="small"
              aria-label={t('shell:tabs.close', { title })}
              onClick={() => onClose(tab.path)}
              sx={{ ml: 0.5, p: 0.25 }}
            >
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
}
