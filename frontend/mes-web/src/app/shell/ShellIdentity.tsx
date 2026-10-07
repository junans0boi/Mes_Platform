import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/platform/auth/authContext';
import { usePlant } from '@/platform/plant/plantContext';
import { useShellContext } from './shellContext';

// 로그인 사용자와 현재 Plant를 상단 한 줄이 읽는 Shell 맥락에 반영한다. 화면을 그리지 않는다.
export function ShellIdentity() {
  const { t } = useTranslation('shell');
  const { session } = useAuth();
  const { plantId } = usePlant();
  const { update } = useShellContext();
  const userName = session ? (session.displayName ?? session.userName) : null;
  const plantName = plantId === null ? null : t('signalBar.plantValue', { id: plantId });

  useEffect(() => {
    update({ userName, plantName });
  }, [update, userName, plantName]);
  return null;
}
