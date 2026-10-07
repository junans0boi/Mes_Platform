import type { SxProps, Theme } from '@mui/material/styles';

// 화면에는 보이지 않고 보조기술에는 읽히는 글자(live region 등)에 쓴다.
export const visuallyHidden: SxProps<Theme> = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
};
