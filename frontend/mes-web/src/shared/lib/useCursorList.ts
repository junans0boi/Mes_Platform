import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isApiError, type ApiError } from '@/platform/api/ApiError';
import { clampPageSize } from './cursorPaging';

export const CURSOR_SORT_MISMATCH = 'CURSOR_SORT_MISMATCH';

export interface CursorPage<TItem> {
  items: TItem[];
  nextCursor: string | null;
  hasMore: boolean;
  asOf?: string;
}

export interface CursorRequest {
  cursor: string | null;
  limit: number;
  sort: string;
}

/**
 * 현재 조건에 해당하는 응답. 새 조건을 조회하는 동안 화면에 남아 있는 이전 페이지(placeholder)는 null이다.
 * 이전 페이지의 nextCursor로 이동하면 새 sort와 맞지 않는 cursor가 만들어지므로, 이동 버튼은 이 값만 근거로 삼는다.
 */
export function settledPage<TItem>(query: {
  data: CursorPage<TItem> | undefined;
  isPlaceholderData: boolean;
}) {
  return query.isPlaceholderData ? null : (query.data ?? null);
}

export interface UseCursorListOptions<TItem> {
  /** feature가 정하는 Query key 접두. 조건·sort·cursor·limit는 이 hook이 덧붙인다. */
  queryKey: QueryKey;
  filters: unknown;
  sort: string;
  cursor: string | null;
  limit?: number;
  enabled?: boolean;
  /** feature adapter. 계약된 API를 호출하고 화면 모델로 바꾼다. 반드시 signal을 요청에 전달해야 취소된다. */
  fetchPage: (request: CursorRequest, signal: AbortSignal) => Promise<CursorPage<TItem>>;
  /** 서버가 cursor와 sort 불일치를 알리면 호출한다. 호출자는 cursor를 버리고 첫 페이지로 돌아간다. */
  onCursorSortMismatch: () => void;
}

// cursor 목록 조회. 조건·sort·cursor가 바뀌면 이전 요청은 signal로 취소하고, 새 응답이 올 때까지 이전 페이지를 유지한다.
export function useCursorList<TItem>(options: UseCursorListOptions<TItem>) {
  const limit = clampPageSize(options.limit);
  const query = useQuery<CursorPage<TItem>, ApiError>({
    queryKey: [
      ...options.queryKey,
      { filters: options.filters, sort: options.sort, cursor: options.cursor, limit },
    ],
    queryFn: ({ signal }) => options.fetchPage({ cursor: options.cursor, limit, sort: options.sort }, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
    // cursor 불일치는 재시도해도 같은 결과다.
    retry: (count, error) => !(isApiError(error) && error.code === CURSOR_SORT_MISMATCH) && count < 1,
  });

  const mismatch = isApiError(query.error) && query.error.code === CURSOR_SORT_MISMATCH;
  const { onCursorSortMismatch } = options;
  useEffect(() => {
    if (mismatch) onCursorSortMismatch();
  }, [mismatch, onCursorSortMismatch]);

  return query;
}
