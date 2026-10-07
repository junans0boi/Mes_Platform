import { createContext, useContext } from 'react';
import type { Session } from './session';

export interface AuthContextValue {
  status: 'anonymous' | 'authenticated';
  session: Session | null;
  /** 실패하면 ApiError를 throw한다(자격 증명 오류는 kind 'unauthorized', code 'INVALID_CREDENTIALS'). */
  login: (userName: string, password: string) => Promise<void>;
  /** 메모리 token과 서버 상태 cache를 지운다. 서버 로그아웃 호출은 인증 계약 확정 후 별도로 다룬다. */
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  status: 'anonymous',
  session: null,
  login: () => Promise.reject(new Error('AuthProvider가 없습니다')),
  logout: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
