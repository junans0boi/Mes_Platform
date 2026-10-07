import '@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider, type AuthProviderProps } from '@/platform/auth/AuthProvider';
import i18n from '@/platform/i18n';
import { PlantProvider } from '@/platform/plant/PlantProvider';
import { UiSettingsProvider } from '@/platform/preferences/UiSettingsProvider';
import { useUiSettings } from '@/platform/preferences/uiSettings';
import { createMesTheme } from '../theme/createMesTheme';
import { useResolvedColorMode } from './useResolvedColorMode';

function MesTheme({ children }: { children: ReactNode }) {
  const { settings } = useUiSettings();
  const mode = useResolvedColorMode(settings.theme);
  const theme = useMemo(() => createMesTheme(mode, settings.density), [mode, settings.density]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

// Provider 순서: QueryClient → Auth → Plant → I18n → UI 설정/Theme. 각 Provider는 한 가지 책임만 가진다.
export function AppProviders({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: AuthProviderProps['initialSession'];
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={initialSession}>
        <PlantProvider>
          <I18nextProvider i18n={i18n}>
            <UiSettingsProvider>
              <MesTheme>{children}</MesTheme>
            </UiSettingsProvider>
          </I18nextProvider>
        </PlantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
