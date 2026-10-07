import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/platform/auth/authContext';
import { PlantContext, type PlantContextValue } from './plantContext';

const storageKey = 'mes.plant';

function savedPlant(): number | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  } catch {
    return null;
  }
}

function savePlant(plantId: number) {
  try {
    localStorage.setItem(storageKey, String(plantId));
  } catch {
    // 저장하지 못해도 이번 세션에서는 선택이 유지된다.
  }
}

// 현재 Plant 선택의 소유자. 선택 가능한 값은 세션의 allowedPlantIds뿐이다.
// 저장된 선택이 허용 범위 밖이면(다른 사용자·권한 변경) 첫 허용 Plant로 대체한다.
export function PlantProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const allowedPlantIds = useMemo(
    () => [...(session?.allowedPlantIds ?? [])].sort((a, b) => a - b),
    [session],
  );
  const [chosen, setChosen] = useState<number | null>(savedPlant);

  const plantId = chosen !== null && allowedPlantIds.includes(chosen) ? chosen : (allowedPlantIds[0] ?? null);

  const selectPlant = useCallback(
    (next: number) => {
      if (!allowedPlantIds.includes(next)) return false;
      setChosen(next);
      savePlant(next);
      return true;
    },
    [allowedPlantIds],
  );

  const value = useMemo<PlantContextValue>(
    () => ({ allowedPlantIds, plantId, selectPlant }),
    [allowedPlantIds, plantId, selectPlant],
  );
  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>;
}
