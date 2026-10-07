import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { SignalState } from '@/app/theme/tokens';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { signalStates } from '../StatusBadge/signal';

export interface ExceptionRibbonProps {
  counts: Record<SignalState, number>;
  /** 현재 필터로 걸린 상태. 같은 항목을 다시 누르면 해제한다. */
  selected?: SignalState | null;
  onSelect?: (state: SignalState | null) => void;
}

// 한 줄 예외 스트립. 이상·지연이 항상 맨 앞에서 크고, 나머지는 작고 흐리다. 0건도 자리는 유지한다.
// 숫자 타일이 아니라 크기로 위계를 만든다. 선택은 액센트 밑줄.
export function ExceptionRibbon({ counts, selected = null, onSelect }: ExceptionRibbonProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  return (
    <Box
      role="group"
      aria-label={t('ribbon.label')}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        px: `${theme.mes.layout.pagePaddingX}px`,
        pt: 0.5,
        pb: 1.5,
      }}
    >
      {signalStates.map((state) => {
        const n = counts[state];
        const active = selected === state;
        const exception = state === 'fault' || state === 'delayed';
        const tone = theme.mes.status[state];
        const color = exception
          ? n > 0
            ? tone.ink
            : theme.mes.inkMuted
          : n > 0
            ? theme.mes.ink
            : theme.mes.inkMuted;
        return (
          <ButtonBase
            key={state}
            onClick={() => onSelect?.(active ? null : state)}
            aria-pressed={active}
            disabled={!onSelect}
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1.25,
              pb: 0.5,
              borderBottom: `3px solid ${active ? theme.mes.accent : 'transparent'}`,
              opacity: n === 0 ? 0.55 : 1,
              '&:hover:not(:disabled)': { borderBottomColor: active ? theme.mes.accent : theme.mes.line },
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: exception ? '1.625rem' : '1.125rem',
                fontWeight: exception ? 700 : 500,
                lineHeight: 1.1,
                color,
              }}
            >
              {n.toLocaleString()}
            </Box>
            <Box sx={{ pb: exception ? 0.5 : 0.25 }}>
              <StatusBadge state={state} quiet={n === 0} />
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
