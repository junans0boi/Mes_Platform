import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@/platform/api/ApiError';
import { StateMessage } from './StateMessage';

export type OperationFeedbackProps =
  | { state: 'loading' }
  | { state: 'empty'; onReset?: () => void }
  | { state: 'error'; error: ApiError; onRetry: () => void };

// 조회 영역의 loading·empty·error 상태. 모두 문장으로 말하고, 오류는 원인·요청 번호·재시도를 함께 제공한다.
export function OperationFeedback(props: OperationFeedbackProps) {
  const { t } = useTranslation('common');

  if (props.state === 'loading') {
    return (
      <Typography role="status" color="text.secondary" sx={{ p: 3 }}>
        {t('feedback.loading')}
      </Typography>
    );
  }
  if (props.state === 'empty') {
    return (
      <StateMessage
        tone="idle"
        title={t('feedback.emptyTitle')}
        body={t('feedback.emptyBody')}
        action={
          props.onReset ? (
            <Button variant="outlined" onClick={props.onReset}>
              {t('search.reset')}
            </Button>
          ) : undefined
        }
      />
    );
  }
  const { error, onRetry } = props;
  return (
    <StateMessage
      tone="fault"
      title={t('feedback.errorTitle')}
      body={t(`feedback.kind.${error.kind}`)}
      detail={
        error.requestId ? (
          <Typography variant="caption" color="text.secondary">
            {t('feedback.requestId')}: {error.requestId}
            {error.operationId ? ` / ${error.operationId}` : ''}
          </Typography>
        ) : null
      }
      action={
        <Button variant="contained" onClick={onRetry}>
          {t('feedback.retry')}
        </Button>
      }
    />
  );
}
