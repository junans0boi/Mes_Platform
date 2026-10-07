import { tokenStore } from '@/platform/auth/tokenStore';
import { unauthorizedBus } from '@/platform/auth/unauthorizedBus';
import { createHttpClient } from './httpClient';

// 앱 전체가 쓰는 typed client. feature의 query·command adapter가 이것을 통해 계약된 경로만 호출한다.
// 값이 비어 있으면 같은 origin(개발 서버는 proxy)을 사용한다.
export const apiClient = createHttpClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  getAccessToken: tokenStore.get,
  onUnauthorized: () => unauthorizedBus.report(),
});
