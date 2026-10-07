import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient } from '@/platform/api/apiClient';
import { CapabilityContext, type CapabilitySource } from '@/platform/authorization/capabilities';
import { AuthContext, type AuthContextValue } from './authContext';
import type { Session } from './session';
import { tokenStore } from './tokenStore';
import { unauthorizedBus } from './unauthorizedBus';

export interface AuthProviderProps {
  children: ReactNode;
  /** 테스트·Storybook용. 토큰 없이 로그인된 상태로 시작한다. 운영 코드는 쓰지 않는다. */
  initialSession?: Session;
}

// 인증 상태의 소유자. 토큰은 tokenStore(메모리)에, 사용자·capability·Plant 범위는 세션에 둔다.
// 새로고침하면 둘 다 사라져 다시 로그인한다(개발 중 한계, FE-13에서 silent refresh).
export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(initialSession ?? null);

  const endSession = useCallback(() => {
    tokenStore.clear();
    setSession(null);
    // 이전 사용자의 서버 상태가 다음 사용자에게 보이지 않도록 모두 지운다.
    queryClient.clear();
  }, [queryClient]);

  // 어느 요청이든 401을 받으면 세션을 끝낸다. 로그인 화면으로의 이동은 RequireAuth가 현재 주소를 보존해 처리한다.
  useEffect(() => unauthorizedBus.subscribe(endSession), [endSession]);

  const login = useCallback(async (userName: string, password: string) => {
    const { data: loginData } = await apiClient.POST('/api/v1/auth/login', { body: { userName, password } });
    tokenStore.set(loginData!.data.accessToken);
    try {
      const { data: sessionData } = await apiClient.GET('/api/v1/auth/session');
      unauthorizedBus.rearm();
      setSession(sessionData!.data);
    } catch (error) {
      tokenStore.clear();
      throw error;
    }
  }, []);

  const capabilities = useMemo<CapabilitySource>(() => {
    const granted = new Set(session?.capabilities ?? []);
    return { has: (code) => granted.has(code) };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session ? 'authenticated' : 'anonymous',
      session,
      login,
      logout: endSession,
    }),
    [session, login, endSession],
  );

  return (
    <AuthContext.Provider value={value}>
      <CapabilityContext.Provider value={capabilities}>{children}</CapabilityContext.Provider>
    </AuthContext.Provider>
  );
}
