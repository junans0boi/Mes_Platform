import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouteError } from 'react-router-dom';
import { StateMessage } from '@/shared/ui/StateMessage';
import { homePath } from '../router/routeRegistry';

export function RouteError() {
  const { t } = useTranslation('shell');
  const error = useRouteError();
  const requestId = (error as { requestId?: string } | null)?.requestId;
  return (
    <StateMessage
      tone="fault"
      title={t('error.routeTitle')}
      body={t('error.routeBody') + (requestId ? ` (${t('boot.requestId')}: ${requestId})` : '')}
      action={
        <Button variant="contained" onClick={() => window.location.reload()}>
          {t('common:action.retry')}
        </Button>
      }
    />
  );
}

export function NotFound() {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  return (
    <StateMessage
      tone="idle"
      title={t('error.notFoundTitle')}
      body={t('error.notFoundBody')}
      action={
        <Button variant="outlined" onClick={() => void navigate(homePath)}>
          {t('nav.label')}
        </Button>
      }
    />
  );
}

export function AccessDenied({ capability }: { capability: string }) {
  const { t } = useTranslation('shell');
  return (
    <StateMessage
      tone="delayed"
      title={t('error.forbiddenTitle')}
      body={t('error.forbiddenBody', { capability })}
    />
  );
}

export function InitialLoading() {
  const { t } = useTranslation('shell');
  return (
    <Typography role="status" sx={{ p: 3 }} color="text.secondary">
      {t('boot.loading')}
    </Typography>
  );
}
