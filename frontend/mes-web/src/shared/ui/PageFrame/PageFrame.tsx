import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export interface PageFrameProps {
  title: string;
  /** 주 명령 영역(오른쪽). 버튼 문구는 실제 동작 동사를 쓴다. */
  actions?: ReactNode;
  children: ReactNode;
}

// 한 장의 흰 면. 제목 줄 아래를 선으로 가르지 않고 간격으로 위계를 만든다.
export function PageFrame({ title, actions, children }: PageFrameProps) {
  const theme = useTheme();
  const { pagePaddingX, pageTitleHeight } = theme.mes.layout;
  return (
    <Box
      component="section"
      aria-labelledby="page-title"
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: `${pagePaddingX}px`,
          minHeight: pageTitleHeight,
        }}
      >
        <Typography id="page-title" component="h1" variant="h1">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</Box>
    </Box>
  );
}
