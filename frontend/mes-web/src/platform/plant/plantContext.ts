import { createContext, useContext } from 'react';

export interface PlantContextValue {
  /** 세션이 허용한 Plant. 이 밖의 값은 선택할 수 없다. */
  allowedPlantIds: readonly number[];
  /** 현재 선택된 Plant. 허용된 Plant가 없으면 null. */
  plantId: number | null;
  /** 허용된 Plant가 아니면 false를 반환하고 선택을 바꾸지 않는다. */
  selectPlant: (plantId: number) => boolean;
}

export const PlantContext = createContext<PlantContextValue>({
  allowedPlantIds: [],
  plantId: null,
  selectPlant: () => false,
});

export function usePlant(): PlantContextValue {
  return useContext(PlantContext);
}
