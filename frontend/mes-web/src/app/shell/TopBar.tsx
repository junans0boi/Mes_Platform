import ExpandMore from '@mui/icons-material/ExpandMore';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/platform/auth/authContext';
import { useCapabilities } from '@/platform/authorization/capabilities';
import { setLanguage, supportedLanguages, type LanguageCode } from '@/platform/i18n';
import { useUiSettings, type ThemeChoice } from '@/platform/preferences/uiSettings';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import type { RouteEntry } from '../router/routeRegistry';
import type { Density } from '../theme/tokens';
import { PlantPicker } from './PlantPicker';
import { connectionSignal } from './connection';
import { useShellContext } from './shellContext';

// 상단 한 줄: 왼쪽은 이동(모듈 메뉴), 오른쪽은 운영 맥락.
// 정상일 때 맥락은 흐린 글자로 가라앉고, 이상·지연·연결 문제가 있을 때만 도형·색·굵기로 드러난다.
export function TopBar({ registry }: { registry: RouteEntry[] }) {
  const theme = useTheme();
  const { t } = useTranslation(['shell', 'dev']);
  const { has } = useCapabilities();
  const { value } = useShellContext();
  const { logout } = useAuth();
  const narrow = useMediaQuery('(max-width:1099.95px)');
  const tiny = useMediaQuery('(max-width:899.95px)');
  const location = useLocation();

  const modules = useMemo(() => {
    const map = new Map<string, RouteEntry[]>();
    for (const entry of registry) {
      if (!has(entry.meta.capability)) continue;
      map.set(entry.meta.module, [...(map.get(entry.meta.module) ?? []), entry]);
    }
    return [...map.entries()];
  }, [registry, has]);
  const activeModule = registry.find((r) => r.meta.path === location.pathname)?.meta.module ?? null;

  const connectionBad = value.connection === 'reconnecting' || value.connection === 'disconnected';
  const staleText =
    value.asOfText && value.asOfAgeSeconds !== null
      ? `${value.asOfText} (${t('signalBar.ago', { count: value.asOfAgeSeconds })})`
      : (value.asOfText ?? '—');

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        height: theme.mes.layout.topBarHeight,
        px: `${theme.mes.layout.pagePaddingX}px`,
        borderBottom: `1px solid ${theme.mes.line}`,
        flexShrink: 0,
      }}
    >
      <Typography
        component="span"
        aria-label={t('shell:appName')}
        sx={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '0.02em' }}
      >
        {t('shell:appName')}
      </Typography>
      <Box
        component="nav"
        aria-label={t('shell:nav.label')}
        sx={{ display: 'flex', alignItems: 'stretch', alignSelf: 'stretch', gap: 0.5, minWidth: 0 }}
      >
        {tiny ? (
          <ModuleMenu label={t('shell:nav.menu')} modules={modules} active={false} flat />
        ) : (
          modules.map(([module, entries]) => (
            <ModuleMenu
              key={module}
              label={t(`shell:modules.${module}`)}
              modules={[[module, entries]]}
              active={module === activeModule}
            />
          ))
        )}
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box
        role="group"
        aria-label={t('shell:signalBar.label')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          color: theme.mes.inkMuted,
          fontSize: '0.8125rem',
          whiteSpace: 'nowrap',
        }}
      >
        {value.faultCount > 0 ? (
          <StatusBadge state="fault" label={`${t('common:signal.fault')} ${value.faultCount}`} />
        ) : null}
        {value.delayedCount > 0 ? (
          <StatusBadge state="delayed" label={`${t('common:signal.delayed')} ${value.delayedCount}`} />
        ) : null}
        <PlantPicker />
        <Box
          role={value.connection === 'disconnected' ? 'alert' : 'status'}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <StatusBadge
            state={connectionSignal[value.connection]}
            label={t(`shell:signalBar.connectionState.${value.connection}`)}
            // 연결이 정상이거나 정보가 없을 때는 조용하게, 문제가 있을 때만 강조한다.
            quiet={!connectionBad}
          />
        </Box>
        {tiny ? null : (
          <Item
            label={connectionBad ? t('shell:signalBar.lastAsOf') : t('shell:signalBar.asOf')}
            emphasis={connectionBad}
          >
            {narrow && value.asOfText ? value.asOfText : staleText}
          </Item>
        )}
        {narrow ? null : (
          <Typography variant="body2" sx={{ color: theme.mes.ink, fontWeight: 600 }}>
            {value.userName ?? t('shell:signalBar.userNone')}
          </Typography>
        )}
        <DisplaySettings />
        <Button size="small" onClick={logout} sx={{ color: theme.mes.inkMuted, whiteSpace: 'nowrap' }}>
          {t('shell:signalBar.logout')}
        </Button>
      </Box>
    </Box>
  );
}

function Item({
  label,
  children,
  emphasis = false,
}: {
  label: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline' }}>
      <span>{label}</span>
      <Box
        component="span"
        sx={{
          color: emphasis ? theme.mes.status.fault.ink : theme.mes.ink,
          fontWeight: emphasis ? 700 : 600,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function ModuleMenu({
  label,
  modules,
  active,
  flat = false,
}: {
  label: string;
  modules: [string, RouteEntry[]][];
  active: boolean;
  flat?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation(['shell', 'dev']);
  const location = useLocation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        endIcon={<ExpandMore sx={{ fontSize: 16 }} />}
        sx={{
          borderRadius: 0,
          px: 1.25,
          color: theme.mes.ink,
          fontWeight: active ? 800 : 600,
          // 현재 모듈은 액센트 밑줄과 굵은 글자로 표시한다(색만으로 전달하지 않는다).
          boxShadow: active ? `inset 0 -3px 0 ${theme.mes.accent}` : 'none',
          '&:hover': { backgroundColor: theme.mes.subtle },
        }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { 'aria-label': label } }}
      >
        {modules.flatMap(([module, entries]) => [
          flat ? (
            <Typography
              key={`h-${module}`}
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, py: 0.5, display: 'block', fontWeight: 700 }}
            >
              {t(`shell:modules.${module}`)}
            </Typography>
          ) : null,
          ...entries.map(({ meta }) => (
            <MenuItem
              key={meta.path}
              component={NavLink}
              to={meta.path}
              selected={location.pathname === meta.path}
              onClick={() => setAnchor(null)}
              sx={{ minWidth: 220 }}
            >
              {t(meta.titleKey, { defaultValue: meta.path })}
            </MenuItem>
          )),
        ])}
      </Menu>
    </>
  );
}

function DisplaySettings() {
  const { t, i18n } = useTranslation('shell');
  const { settings, update } = useUiSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={t('signalBar.settings')}>
        <IconButton
          size="small"
          aria-label={t('signalBar.settings')}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <SettingsOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 340 }}>
          <Setting label={t('signalBar.language')}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={i18n.language}
              aria-label={t('signalBar.language')}
              onChange={(_e, v: LanguageCode | null) => v && void setLanguage(v)}
            >
              {supportedLanguages.map((l) => (
                <ToggleButton key={l.code} value={l.code} lang={l.code}>
                  {l.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Setting>
          <Setting label={t('signalBar.theme')}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={settings.theme}
              aria-label={t('signalBar.theme')}
              onChange={(_e, v: ThemeChoice | null) => v && update({ theme: v })}
            >
              <ToggleButton value="light">{t('signalBar.themeLight')}</ToggleButton>
              <ToggleButton value="dark">{t('signalBar.themeDark')}</ToggleButton>
              <ToggleButton value="system">{t('signalBar.themeSystem')}</ToggleButton>
            </ToggleButtonGroup>
          </Setting>
          <Setting label={t('signalBar.density')}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={settings.density}
              aria-label={t('signalBar.density')}
              onChange={(_e, v: Density | null) => v && update({ density: v })}
            >
              <ToggleButton value="compact">{t('signalBar.densityOption.compact')}</ToggleButton>
              <ToggleButton value="standard">{t('signalBar.densityOption.standard')}</ToggleButton>
              <ToggleButton value="comfortable">{t('signalBar.densityOption.comfortable')}</ToggleButton>
            </ToggleButtonGroup>
          </Setting>
        </Box>
      </Popover>
    </>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
