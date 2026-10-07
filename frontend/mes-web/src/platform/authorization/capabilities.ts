import { createContext, useContext } from 'react';

// capability code는 메뉴 경로가 아니라 업무 권한이다. 서버가 최종 검증하며, 프론트는 메뉴·route·action 노출만 거른다.
export interface CapabilitySource {
  has: (code: string) => boolean;
}

// ponytail: FE-04가 세션의 capability 목록으로 이 기본값을 교체한다. 그 전에는 모든 화면을 허용한다(임시).
export const allowAllCapabilities: CapabilitySource = { has: () => true };

export const CapabilityContext = createContext<CapabilitySource>(allowAllCapabilities);

export function useCapabilities(): CapabilitySource {
  return useContext(CapabilityContext);
}
