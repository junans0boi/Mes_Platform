import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { loadUiSettings, saveUiSettings, UiSettingsContext, type UiSettings } from './uiSettings';

export function UiSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>(loadUiSettings);
  const update = useCallback((patch: Partial<UiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveUiSettings(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>;
}
