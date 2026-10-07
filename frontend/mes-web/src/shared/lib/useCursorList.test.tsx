import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@/platform/api/ApiError';
import { MAX_PAGE_SIZE } from './cursorPaging';
import {
  CURSOR_SORT_MISMATCH,
  settledPage,
  useCursorList,
  type CursorPage,
  type CursorRequest,
} from './useCursorList';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const page = (items: number[], next: string | null = null): CursorPage<number> => ({
  items,
  nextCursor: next,
  hasMore: next !== null,
});

describe('useCursorList', () => {
  it('limit은 200을 넘겨 요청하지 않는다', async () => {
    const requests: CursorRequest[] = [];
    const { result } = renderHook(
      () =>
        useCursorList<number>({
          queryKey: ['t'],
          filters: {},
          sort: '-a',
          cursor: null,
          limit: 5000,
          fetchPage: async (request) => {
            requests.push(request);
            return page([1]);
          },
          onCursorSortMismatch: () => {},
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toEqual([{ cursor: null, limit: MAX_PAGE_SIZE, sort: '-a' }]);
  });

  it('조건이 바뀌면 이전 요청을 취소하고 새 요청만 반영한다', async () => {
    const signals: AbortSignal[] = [];
    const fetchPage = (request: CursorRequest, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<CursorPage<number>>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        setTimeout(() => resolve(page([request.sort === 'a' ? 1 : 2])), 20);
      });
    };
    const { result, rerender } = renderHook(
      ({ sort }: { sort: string }) =>
        useCursorList<number>({
          queryKey: ['t'],
          filters: {},
          sort,
          cursor: null,
          fetchPage,
          onCursorSortMismatch: () => {},
        }),
      { wrapper: wrapper(), initialProps: { sort: 'a' } },
    );
    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ sort: 'b' });
    await waitFor(() => expect(result.current.data?.items).toEqual([2]));
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });

  it('새 조건을 조회하는 동안 이전 페이지를 유지한다', async () => {
    const fetchPage = (request: CursorRequest) =>
      new Promise<CursorPage<number>>((resolve) =>
        setTimeout(() => resolve(page([request.sort === 'a' ? 1 : 2])), 30),
      );
    const { result, rerender } = renderHook(
      ({ sort }: { sort: string }) =>
        useCursorList<number>({
          queryKey: ['t'],
          filters: {},
          sort,
          cursor: null,
          fetchPage,
          onCursorSortMismatch: () => {},
        }),
      { wrapper: wrapper(), initialProps: { sort: 'a' } },
    );
    await waitFor(() => expect(result.current.data?.items).toEqual([1]));
    rerender({ sort: 'b' });
    expect(result.current.data?.items).toEqual([1]);
    expect(result.current.isPlaceholderData).toBe(true);
    // 이전 페이지의 nextCursor는 새 조건의 이동 근거가 아니다.
    expect(settledPage(result.current)).toBeNull();
    await waitFor(() => expect(result.current.data?.items).toEqual([2]));
    expect(settledPage(result.current)?.items).toEqual([2]);
  });

  it('CURSOR_SORT_MISMATCH를 받으면 재시도하지 않고 첫 페이지로 돌아가게 알린다', async () => {
    let calls = 0;
    const onMismatch = vi.fn();
    const { result } = renderHook(
      () =>
        useCursorList<number>({
          queryKey: ['t'],
          filters: {},
          sort: 'a',
          cursor: 'stale',
          fetchPage: async () => {
            calls += 1;
            throw new ApiError({
              kind: 'badRequest',
              status: 400,
              code: CURSOR_SORT_MISMATCH,
              requestId: 'r',
            });
          },
          onCursorSortMismatch: onMismatch,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(onMismatch).toHaveBeenCalled());
    expect(calls).toBe(1);
  });

  it('다른 오류는 그대로 노출하고 다시 시도할 수 있다', async () => {
    let fail = true;
    const { result } = renderHook(
      () =>
        useCursorList<number>({
          queryKey: ['t'],
          filters: {},
          sort: 'a',
          cursor: null,
          fetchPage: async () => {
            if (fail)
              throw new ApiError({ kind: 'server', status: 500, code: 'UNEXPECTED_ERROR', requestId: 'r1' });
            return page([9]);
          },
          onCursorSortMismatch: () => {},
        }),
      { wrapper: wrapper() },
    );
    // 일시 오류는 한 번 자동 재시도한 뒤에 노출된다.
    await waitFor(() => expect(result.current.error?.requestId).toBe('r1'), { timeout: 4000 });
    fail = false;
    void result.current.refetch();
    await waitFor(() => expect(result.current.data?.items).toEqual([9]));
  });
});
