import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { SignalState } from '@/app/theme/tokens';
import { StatusBadge } from './StatusBadge/StatusBadge';

export interface StateMessageProps {
  tone: SignalState;
  title: string;
  body: string;
  /** 다음 행동. 오류·빈 상태는 무엇이 일어났는지와 무엇을 하면 되는지를 함께 말한다. */
  action?: ReactNode;
  detail?: ReactNode;
}

// 오류·권한·빈 상태 공통 표시. 상자 대신 3px 상태색 막대를 앞세운 한 덩어리이고 영역 안에서만 쓴다.
export function StateMessage({ tone, title, body, action, detail }: StateMessageProps) {
  const theme = useTheme();
  const { pagePaddingX } = theme.mes.layout;
  return (
    <Box
      role={tone === 'fault' ? 'alert' : 'status'}
      sx={{
        m: `${pagePaddingX}px`,
        maxWidth: 560,
        pl: 2.5,
        borderLeft: `3px solid ${theme.mes.status[tone].ink}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'flex-start',
      }}
    >
      <StatusBadge state={tone} quiet />
      <Typography component="h2" variant="h1">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {body}
      </Typography>
      {detail}
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
