// 시각 토큰의 단일 출처. 설계: docs/specs/frontend/2026-10-07-mes-web-visual-design-plan.md §2.2~2.3
// 컴포넌트는 hex 값이 아니라 theme.mes의 의미 토큰만 참조한다.
// 원칙: 정상은 조용하게, 예외는 크게. 액센트는 코발트 하나이고 위험·경고 색과 겹치지 않는다.

export type SignalState = 'ok' | 'running' | 'delayed' | 'fault' | 'idle';
export type ColorMode = 'light' | 'dark';
export type Density = 'compact' | 'standard' | 'comfortable';

export interface StatusTone {
  ink: string;
  tint: string;
}

export interface MesPalette {
  surface: string;
  subtle: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentTint: string;
  accentContrast: string;
  status: Record<SignalState, StatusTone>;
  /** 화면 맨 위 3px 경광선. 평소에는 거의 보이지 않는다. */
  beacon: { normal: string; delayed: string; fault: string };
}

export const palettes: Record<ColorMode, MesPalette> = {
  light: {
    surface: '#FFFFFF',
    subtle: '#F4F6F8',
    line: '#E4E9EE',
    lineStrong: '#7B8895',
    ink: '#0D1A24',
    inkMuted: '#526270',
    accent: '#2447C8',
    accentTint: '#E9EEFC',
    accentContrast: '#FFFFFF',
    status: {
      ok: { ink: '#1B7544', tint: '#E4F3EA' },
      running: { ink: '#0D1A24', tint: '#EEF1F4' },
      delayed: { ink: '#8A5200', tint: '#FDF0D2' },
      fault: { ink: '#9C110B', tint: '#FCE7E4' },
      idle: { ink: '#526270', tint: '#F1F3F5' },
    },
    beacon: { normal: '#E4E9EE', delayed: '#BF7A00', fault: '#D32F25' },
  },
  dark: {
    surface: '#0F1A23',
    subtle: '#16232E',
    line: '#25343F',
    lineStrong: '#6F818F',
    ink: '#E8EEF3',
    inkMuted: '#A3B1BC',
    accent: '#8FA9FF',
    accentTint: '#1B2850',
    accentContrast: '#0F1A23',
    status: {
      ok: { ink: '#7FD6A4', tint: '#153526' },
      running: { ink: '#E8EEF3', tint: '#1C2A35' },
      delayed: { ink: '#F2B864', tint: '#43330F' },
      fault: { ink: '#FF8E84', tint: '#4A1D1A' },
      idle: { ink: '#A3B1BC', tint: '#1C2A35' },
    },
    beacon: { normal: '#25343F', delayed: '#E8A317', fault: '#FF5A4F' },
  },
};

// 표 행 높이(px). 운영 화면 기본은 compact.
export const rowHeight: Record<Density, number> = { compact: 32, standard: 40, comfortable: 52 };

export const fonts = {
  sans: "'SUIT Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif",
  // LOT, QR, 작업지시번호처럼 문자 단위로 비교하는 식별자에만 사용한다.
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
};

export const layout = {
  beaconHeight: 3,
  topBarHeight: 44,
  tabsHeight: 32,
  pageTitleHeight: 56,
  pagePaddingX: 24,
  // 이상·지연 행의 왼쪽 표식 두께와 선택 표식 두께
  rowMarker: 4,
  radius: 2,
};
