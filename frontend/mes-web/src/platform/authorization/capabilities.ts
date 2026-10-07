import { createContext, useContext } from 'react';

// capability code는 메뉴 경로가 아니라 업무 권한이다. 서버가 최종 검증하며, 프론트는 메뉴·route·action 노출만 거른다.
export interface CapabilitySource {
  has: (code: string) => boolean;
}

// AuthProvider가 세션의 capability 목록으로 값을 채운다. Provider 밖에서는 아무것도 허용하지 않는다.
export const denyAllCapabilities: CapabilitySource = { has: () => false };

export const CapabilityContext = createContext<CapabilitySource>(denyAllCapabilities);

export function useCapabilities(): CapabilitySource {
  return useContext(CapabilityContext);
}
