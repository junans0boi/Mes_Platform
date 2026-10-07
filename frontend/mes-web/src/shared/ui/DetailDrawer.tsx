import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface DetailDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// 목록 옆 상세 영역. 열림 여부는 URL의 선택 id가 소유하므로 이 컴포넌트는 상태를 갖지 않는다.
export function DetailDrawer({ open, title, onClose, children }: DetailDrawerProps) {
  const { t } = useTranslation('common');
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 'min(520px, 100vw)' } } }}
    >
      <Box
        component="section"
        aria-label={title}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 2 }}>
          <Typography component="h2" variant="h2">
            {title}
          </Typography>
          <IconButton aria-label={t('detail.close')} onClick={onClose} autoFocus>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, pb: 2 }}>{children}</Box>
      </Box>
    </Drawer>
  );
}
