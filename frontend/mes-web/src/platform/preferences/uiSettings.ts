import { createContext, useContext } from 'react';
import type { Density } from '@/app/theme/tokens';

export type ThemeChoice = 'light' | 'dark' | 'system';

// 작은 전역 UI 상태만 둔다. 서버 데이터, 토큰, 민감한 인증정보는 여기에 저장하지 않는다.
export interface UiSettings {
  density: Density;
  navCollapsed: boolean;
  notificationsOpen: boolean;
  theme: ThemeChoice;
}

export const defaultUiSettings: UiSettings = {
  density: 'compact',
  navCollapsed: false,
  notificationsOpen: false,
  theme: 'light',
};

const storageKey = 'mes.ui';
const densities: Density[] = ['compact', 'standard', 'comfortable'];
const themes: ThemeChoice[] = ['light', 'dark', 'system'];

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultUiSettings;
    const v = JSON.parse(raw) as Partial<UiSettings>;
    return {
      density: densities.includes(v.density as Density) ? (v.density as Density) : defaultUiSettings.density,
      navCollapsed: typeof v.navCollapsed === 'boolean' ? v.navCollapsed : defaultUiSettings.navCollapsed,
      notificationsOpen: false,
      theme: themes.includes(v.theme as ThemeChoice) ? (v.theme as ThemeChoice) : defaultUiSettings.theme,
    };
  } catch {
    return defaultUiSettings;
  }
}

export function saveUiSettings(settings: UiSettings) {
  try {
    // 알림 drawer 열림 여부는 복원 가치가 낮아 저장하지 않는다.
    const { notificationsOpen: _ignored, ...persisted } = settings;
    void _ignored;
    localStorage.setItem(storageKey, JSON.stringify(persisted));
  } catch {
    // 저장 실패는 무시한다. 이번 세션에서는 계속 적용된다.
  }
}

export interface UiSettingsContextValue {
  settings: UiSettings;
  update: (patch: Partial<UiSettings>) => void;
}

export const UiSettingsContext = createContext<UiSettingsContextValue | null>(null);

export function useUiSettings(): UiSettingsContextValue {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) throw new Error('UiSettingsProvider가 필요합니다');
  return ctx;
}
