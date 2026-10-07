import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/platform/auth/authContext';
import { loginUrl } from '@/platform/auth/returnTo';

// 로그인하지 않았거나 401로 세션이 끝나면 현재 주소를 보존해 로그인으로 보낸다.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'authenticated') return children;
  return <Navigate to={loginUrl(`${location.pathname}${location.search}${location.hash}`)} replace />;
}
