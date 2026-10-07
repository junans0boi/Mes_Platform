export const loginPath = '/login';

// 로그인 후 돌아갈 주소. 같은 origin의 앱 내부 경로만 허용해 외부 주소로 보내는 open redirect를 막는다.
export function safeReturnTo(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  if (raw === loginPath || raw.startsWith(`${loginPath}?`) || raw.startsWith(`${loginPath}#`))
    return fallback;
  return raw;
}

export function loginUrl(returnTo: string): string {
  return returnTo === '/' ? loginPath : `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
}
