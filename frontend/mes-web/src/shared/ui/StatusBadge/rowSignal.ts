import type { SignalState } from '@/app/theme/tokens';

// 예외 행에만 왼쪽 표식이 붙는다(위치로 알리는 단서). 정상류 행은 표식이 없다.
// 표식 모양은 theme의 MuiTableRow 스타일이 정의한다.
export function rowSignalProps(state: SignalState): { 'data-row-signal'?: SignalState } {
  return state === 'fault' || state === 'delayed' ? { 'data-row-signal': state } : {};
}
