import type { SignalState } from '@/app/theme/tokens';

export const signalStates: readonly SignalState[] = ['fault', 'delayed', 'running', 'ok', 'idle'] as const;
// 이상·지연이 앞에 오는 순서가 화면 전체의 기본 위치 규칙이다 (예외 리본, 정렬 옵션).
