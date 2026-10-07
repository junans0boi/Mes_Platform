import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

// LOT, QR, 작업지시번호처럼 문자 단위로 비교하는 값 전용. 일반 라벨에는 쓰지 않는다.
export function Identifier({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{ fontFamily: (t) => t.mes.fonts.mono, fontSize: '0.8125rem', letterSpacing: 0 }}
    >
      {children}
    </Box>
  );
}
