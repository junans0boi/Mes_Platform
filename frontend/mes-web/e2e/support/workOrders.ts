import type { Page, Request } from '@playwright/test';

// 계약(contracts/openapi.yaml)의 listWorkOrders 응답을 흉내 낸다. cursor는 `<sort>|<offset>` 형태의 불투명 문자열이며,
// sort가 다른 cursor는 서버처럼 400 CURSOR_SORT_MISMATCH로 거부한다.
export interface WorkOrderMockOptions {
  total?: number;
  /** 해당 접두 검색은 응답을 늦춘다(취소 검증용). */
  slowPrefix?: string;
  slowMs?: number;
  /** 처음 `failCount`번(기본 2: 자동 재시도 1회를 포함)의 요청을 이 상태로 실패시킨다. */
  failFirstWith?: number;
  failCount?: number;
}

export interface SeenRequest {
  url: URL;
  params: URLSearchParams;
}

const statuses = ['PLANNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FINISHED', 'CANCELED'];

function row(index: number, prefix: string) {
  return {
    workOrderId: index,
    workOrderNumber: `${prefix}${String(index).padStart(5, '0')}`,
    plantId: 1,
    lineName: null,
    productModelName: null,
    status: statuses[index % statuses.length],
    plannedQuantity: 1000 + index,
    completedQuantity: index,
    goodQuantity: index,
    defectQuantity: 0,
    priority: null,
    plannedStartAt: '2026-10-07T00:00:00Z',
    plannedEndAt: null,
    actualStartAt: null,
    actualEndAt: null,
  };
}

export async function mockWorkOrders(page: Page, options: WorkOrderMockOptions = {}) {
  const seen: SeenRequest[] = [];
  let failures = 0;
  await page.route('**/api/v1/production/work-orders?*', async (route) => {
    const request: Request = route.request();
    const url = new URL(request.url());
    const params = url.searchParams;
    seen.push({ url, params });

    if (options.failFirstWith && failures < (options.failCount ?? 2)) {
      failures += 1;
      await route.fulfill({
        status: options.failFirstWith,
        contentType: 'application/problem+json',
        json: {
          type: 't',
          title: 'UNEXPECTED_ERROR',
          status: options.failFirstWith,
          code: 'UNEXPECTED_ERROR',
          requestId: 'req-e2e-500',
        },
      });
      return;
    }

    const prefix = params.get('workOrderNumberPrefix') ?? '';
    if (options.slowPrefix && prefix === options.slowPrefix) {
      await new Promise((resolve) => setTimeout(resolve, options.slowMs ?? 1500));
    }

    const sort = params.get('sort') ?? '-plannedStartAt';
    const limit = Math.min(Number(params.get('limit') ?? 50), 200);
    const cursor = params.get('cursor');
    let offset = 0;
    if (cursor) {
      const [cursorSort, cursorOffset] = cursor.split('|');
      if (cursorSort !== sort || cursorOffset === undefined || Number.isNaN(Number(cursorOffset))) {
        await route.fulfill({
          status: 400,
          contentType: 'application/problem+json',
          json: {
            type: 't',
            title: 'CURSOR_SORT_MISMATCH',
            status: 400,
            code: 'CURSOR_SORT_MISMATCH',
            requestId: 'req-e2e-mismatch',
          },
        });
        return;
      }
      offset = Number(cursorOffset);
    }

    const total = prefix === 'NONE' ? 0 : (options.total ?? 120);
    const labelPrefix = prefix || 'WO-';
    const items = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => {
      // 내림차순이면 큰 번호부터, 오름차순이면 작은 번호부터 보여 정렬이 바뀐 것을 눈으로도 확인할 수 있다.
      const index = sort.startsWith('-') ? total - offset - i : offset + i + 1;
      return row(index, labelPrefix);
    });
    const hasMore = offset + limit < total;
    await route.fulfill({
      json: {
        data: {
          items,
          nextCursor: hasMore ? `${sort}|${offset + limit}` : null,
          hasMore,
          asOf: '2026-10-07T10:00:00Z',
        },
        meta: { requestId: '00000000-0000-4000-8000-0000000000aa', operationId: null },
      },
    });
  });
  return seen;
}
