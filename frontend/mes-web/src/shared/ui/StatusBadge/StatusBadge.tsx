import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { SignalState } from '@/app/theme/tokens';

// 도형은 상태마다 다르고(원 / 반원 / 삼각형 / 팔각형 / 빈 원) 글자와 함께 쓴다. pill 배경은 쓰지 않는다.
// 이상·지연은 굵고 크게, 정상·진행·대기는 보통 굵기로 조용하게 표시한다.
function Glyph({ state }: { state: SignalState }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  switch (state) {
    case 'ok':
      return (
        <>
          <circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" />
          <path d="M5 8.2l2.1 2.1L11 6.2" {...stroke} stroke="var(--glyph-knockout)" />
        </>
      );
    case 'running':
      return (
        <>
          <circle cx="8" cy="8" r="6" {...stroke} />
          <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" />
        </>
      );
    case 'delayed':
      return (
        <>
          <path d="M8 1.5l6.8 12H1.2z" fill="currentColor" stroke="none" />
          <path d="M8 6v3.5M8 11.4v.1" {...stroke} stroke="var(--glyph-knockout)" />
        </>
      );
    case 'fault':
      return (
        <>
          <path d="M5.1 1.4h5.8l3.7 3.7v5.8l-3.7 3.7H5.1l-3.7-3.7V5.1z" fill="currentColor" stroke="none" />
          <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" {...stroke} stroke="var(--glyph-knockout)" />
        </>
      );
    case 'idle':
      return (
        <>
          <circle cx="8" cy="8" r="6" {...stroke} />
          <path d="M5.4 8h5.2" {...stroke} />
        </>
      );
  }
}

export interface StatusBadgeProps {
  state: SignalState;
  /** 기본값은 공통 상태 이름(common:signal.*). feature가 더 구체적인 문구를 줄 수 있다. */
  label?: string;
  /** 글자 없이 도형만 보일 때도 접근 가능한 이름은 유지된다. */
  iconOnly?: boolean;
  /** 이상·지연 강조(굵게 + 큰 도형)를 끈다. 맥락 줄처럼 이미 강조된 곳에서 쓴다. */
  quiet?: boolean;
}

export function StatusBadge({ state, label, iconOnly = false, quiet = false }: StatusBadgeProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const tone = theme.mes.status[state];
  const text = label ?? t(`signal.${state}`);
  const exception = !quiet && (state === 'fault' || state === 'delayed');
  const size = exception ? 15 : 13;
  return (
    <Box
      component="span"
      data-signal={state}
      {...(iconOnly ? { role: 'img', 'aria-label': text } : {})}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        gap: 0.75,
        color: tone.ink,
        fontWeight: exception ? 700 : 500,
        fontSize: '0.8125rem',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        '--glyph-knockout': theme.mes.surface,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <Glyph state={state} />
      </svg>
      {iconOnly ? null : <span>{text}</span>}
    </Box>
  );
}
