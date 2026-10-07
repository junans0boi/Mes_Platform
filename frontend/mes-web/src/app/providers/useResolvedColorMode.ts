import { useSyncExternalStore } from 'react';
import type { ThemeChoice } from '@/platform/preferences/uiSettings';
import type { ColorMode } from '../theme/tokens';

const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useResolvedColorMode(choice: ThemeChoice): ColorMode {
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  if (choice === 'system') return systemDark ? 'dark' : 'light';
  return choice;
}
