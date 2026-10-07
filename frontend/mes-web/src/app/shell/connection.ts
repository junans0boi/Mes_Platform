import type { SignalState } from '../theme/tokens';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected' | 'unknown';

// 연결 상태도 같은 표시등 문법을 쓴다. 실제 값은 realtime coordinator(FE-10)가 채운다.
export const connectionSignal: Record<ConnectionState, SignalState> = {
  connected: 'ok',
  reconnecting: 'delayed',
  disconnected: 'fault',
  unknown: 'idle',
};
