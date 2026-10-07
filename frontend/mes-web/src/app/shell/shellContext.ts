import { createContext, useContext } from 'react';
import type { ConnectionState } from './connection';

// 상단 한 줄(운영 맥락)과 경광선이 읽는 값. 실제 값은 후속 티켓이 채운다:
// Plant·사용자는 FE-04, 연결·기준 시각은 FE-10, 이상·지연 합계는 각 모니터링 화면.
export interface ShellContextValue {
  plantName: string | null;
  connection: ConnectionState;
  /** 이미 포맷된 기준 시각 문구. 예: "10:42:08" */
  asOfText: string | null;
  /** 기준 시각으로부터의 경과(초). 오래되면 지연으로 표시한다(FE-10). */
  asOfAgeSeconds: number | null;
  userName: string | null;
  faultCount: number;
  delayedCount: number;
}

export const defaultShellContext: ShellContextValue = {
  plantName: null,
  connection: 'unknown',
  asOfText: null,
  asOfAgeSeconds: null,
  userName: null,
  faultCount: 0,
  delayedCount: 0,
};

export interface ShellContextHandle {
  value: ShellContextValue;
  update: (patch: Partial<ShellContextValue>) => void;
}

export const ShellContext = createContext<ShellContextHandle>({
  value: defaultShellContext,
  update: () => {},
});

export function useShellContext(): ShellContextHandle {
  return useContext(ShellContext);
}

export type OverallState = 'normal' | 'delayed' | 'fault';

// 전체 상태 = 이상·지연 건수와 연결 상태 중 가장 나쁜 것. 데이터가 끊긴 것도 예외다.
export function overallState(v: ShellContextValue): OverallState {
  if (v.faultCount > 0 || v.connection === 'disconnected') return 'fault';
  if (v.delayedCount > 0 || v.connection === 'reconnecting') return 'delayed';
  return 'normal';
}
