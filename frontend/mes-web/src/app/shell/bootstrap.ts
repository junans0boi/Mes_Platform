import { useCallback, useEffect, useRef, useState } from 'react';

export interface BootstrapContext {
  /** 0부터 시작하는 시도 횟수. 재시도마다 1씩 늘어난다. */
  attempt: number;
}
export type BootstrapLoader = (context: BootstrapContext) => Promise<void>;
export type BootStatus = 'loading' | 'ready' | 'failed';

export interface BootState {
  status: BootStatus;
  error: unknown;
  retry: () => void;
}

// ponytail: FE-04가 세션(사용자·capability·Plant 범위) 조회로 교체한다. 지금은 바로 성공한다.
// 개발 서버에서만 ?__boot=fail-once 로 첫 시도 실패→재시도 흐름을 확인할 수 있다(E2E용).
export const defaultBootstrapLoader: BootstrapLoader = async ({ attempt }) => {
  if (
    import.meta.env.DEV &&
    attempt === 0 &&
    new URLSearchParams(window.location.search).get('__boot') === 'fail-once'
  ) {
    throw Object.assign(new Error('boot failed (test hook)'), { requestId: 'req-test-0001' });
  }
};

export function useBootstrap(loader: BootstrapLoader): BootState {
  const [status, setStatus] = useState<BootStatus>('loading');
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    let cancelled = false;
    // 상태 초기화는 microtask로 미뤄 effect 본문에서 동기 setState를 하지 않는다.
    queueMicrotask(() => {
      if (!cancelled && id === latest.current) {
        setStatus('loading');
        setError(null);
      }
    });
    loader({ attempt }).then(
      () => {
        if (!cancelled && id === latest.current) setStatus('ready');
      },
      (e: unknown) => {
        if (!cancelled && id === latest.current) {
          setError(e);
          setStatus('failed');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loader, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { status, error, retry };
}
