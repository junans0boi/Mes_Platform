import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { StateMessage } from '@/shared/ui/StateMessage';
import type { BootState as BootStateValue } from './bootstrap';

// Shell 골격은 그대로 두고 작업 영역 안에서만 로딩·실패를 보여준다. 실패에는 재시도가 있다.
export function BootState({ boot }: { boot: BootStateValue }) {
  const { t } = useTranslation('shell');
  if (boot.status === 'loading') {
    return (
      <Typography role="status" sx={{ p: 3 }} color="text.secondary">
        {t('boot.loading')}
      </Typography>
    );
  }
  const requestId = (boot.error as { requestId?: string } | null)?.requestId;
  return (
    <StateMessage
      tone="fault"
      title={t('boot.failedTitle')}
      body={t('boot.failedBody')}
      detail={
        requestId ? (
          <Typography variant="caption" color="text.secondary">
            {t('boot.requestId')}: {requestId}
          </Typography>
        ) : null
      }
      action={
        <Button variant="contained" onClick={boot.retry}>
          {t('common:action.retry')}
        </Button>
      }
    />
  );
}
