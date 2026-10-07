import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, isApiError } from '@/platform/api/ApiError';
import { useAuth } from '@/platform/auth/authContext';
import { safeReturnTo } from '@/platform/auth/returnTo';

function errorMessageKey(error: ApiError): string {
  if (error.code === 'INVALID_CREDENTIALS') return 'auth:login.error.INVALID_CREDENTIALS';
  if (error.kind === 'network') return 'auth:login.error.network';
  return 'auth:login.error.unexpected';
}

// 로그인 화면. 성공하면 보존해 둔 원래 주소(returnTo)로, 없으면 첫 화면으로 이동한다.
export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'), '/');

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!userName.trim() || !password) return;
    setPending(true);
    setError(null);
    try {
      await login(userName.trim(), password);
      void navigate(returnTo, { replace: true });
    } catch (e) {
      setError(
        isApiError(e)
          ? e
          : new ApiError({ kind: 'unexpected', status: null, code: 'UNEXPECTED', requestId: null, cause: e }),
      );
    } finally {
      setPending(false);
    }
  }

  const userNameMissing = touched && !userName.trim();
  const passwordMissing = touched && !password;

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        component="form"
        onSubmit={(e) => void submit(e)}
        noValidate
        variant="outlined"
        sx={{ width: 380, maxWidth: '100%', p: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('auth:login.title')}
        </Typography>
        {params.get('returnTo') ? <Alert severity="info">{t('auth:login.loginRequired')}</Alert> : null}
        {error ? (
          <Alert severity="error" role="alert">
            {t(errorMessageKey(error))}
            {error.requestId ? ` (${t('auth:login.error.requestId')}: ${error.requestId})` : ''}
          </Alert>
        ) : null}
        <TextField
          label={t('auth:login.userName')}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          error={userNameMissing}
          helperText={userNameMissing ? t('auth:login.required') : undefined}
        />
        <TextField
          label={t('auth:login.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          error={passwordMissing}
          helperText={passwordMissing ? t('auth:login.required') : undefined}
        />
        <Button type="submit" variant="contained" size="large" disabled={pending}>
          {pending ? t('auth:login.submitting') : t('auth:login.submit')}
        </Button>
      </Paper>
    </Box>
  );
}
