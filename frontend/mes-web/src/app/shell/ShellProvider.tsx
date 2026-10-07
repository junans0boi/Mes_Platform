import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { defaultShellContext, ShellContext, type ShellContextValue } from './shellContext';

export function ShellProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ShellContextValue>(defaultShellContext);
  const update = useCallback(
    (patch: Partial<ShellContextValue>) => setValue((prev) => ({ ...prev, ...patch })),
    [],
  );
  const handle = useMemo(() => ({ value, update }), [value, update]);
  return <ShellContext.Provider value={handle}>{children}</ShellContext.Provider>;
}
