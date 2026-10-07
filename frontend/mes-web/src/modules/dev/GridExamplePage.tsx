import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid-premium';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/platform/api/apiClient';
import type { components, operations } from '@/platform/api/generated/schema';
import { usePlant } from '@/platform/plant/plantContext';
import { withPlantId } from '@/platform/plant/withPlantId';
import type { SearchField, SearchValues } from '@/shared/forms/searchFields';
import { SearchPanel } from '@/shared/forms/SearchPanel';
import type { ListUrlConfig } from '@/shared/lib/listUrlState';
import { formatClock } from '@/shared/lib/formatClock';
import { settledPage, useCursorList, type CursorRequest } from '@/shared/lib/useCursorList';
import { useListUrlState } from '@/shared/lib/useListUrlState';
import { DetailDrawer } from '@/shared/ui/DetailDrawer';
import { PageFrame } from '@/shared/ui/PageFrame/PageFrame';
import { ServerDataGrid } from '@/shared/ui/ServerDataGrid/ServerDataGrid';

type WorkOrder = components['schemas']['WorkOrderSummary'];
type WorkOrderStatus = components['schemas']['WorkOrderStatus'];

const statuses: WorkOrderStatus[] = ['PLANNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FINISHED', 'CANCELED'];

// 검색 필드 정의는 화면 상수다(참조가 바뀌면 URL 상태 hook이 다시 계산한다).
const fields: SearchField[] = [
  { type: 'text', key: 'workOrderNumberPrefix', labelKey: 'dev:grid.fields.prefix' },
  {
    type: 'select',
    key: 'status',
    labelKey: 'dev:grid.fields.status',
    multiple: true,
    options: statuses.map((value) => ({ value, labelKey: `dev:grid.status.${value}` })),
  },
  { type: 'dateRange', fromKey: 'plannedFrom', toKey: 'plannedTo', labelKey: 'dev:grid.fields.planned' },
];
const listConfig: ListUrlConfig = {
  fields,
  allowedSorts: [
    'plannedStartAt',
    '-plannedStartAt',
    'workOrderNumber',
    '-workOrderNumber',
    'status',
    '-status',
  ],
  defaultSort: '-plannedStartAt',
};

// feature query adapter: 폼 값을 계약된 요청으로 바꾼다. 날짜는 UTC 하루 경계로 보낸다.
function toQuery(values: SearchValues, plantId: number, request: CursorRequest) {
  const status = values.status;
  const from = values.plannedFrom;
  const to = values.plannedTo;
  return withPlantId(plantId, {
    limit: request.limit,
    ...(request.cursor ? { cursor: request.cursor } : {}),
    sort: request.sort as NonNullable<operations['listWorkOrders']['parameters']['query']>['sort'],
    ...(typeof values.workOrderNumberPrefix === 'string'
      ? { workOrderNumberPrefix: values.workOrderNumberPrefix }
      : {}),
    ...(Array.isArray(status) ? { status: status as WorkOrderStatus[] } : {}),
    ...(typeof from === 'string' ? { plannedFrom: `${from}T00:00:00Z` } : {}),
    ...(typeof to === 'string' ? { plannedTo: `${to}T23:59:59Z` } : {}),
  });
}

// FE-05 검증용 임시 화면: 공통 목록 패턴을 계약된 listWorkOrders로 보여준다. FE-06에서 실제 WorkOrder 목록이 들어오면 제거한다.
export default function GridExamplePage() {
  const { t } = useTranslation('dev');
  const { plantId } = usePlant();
  const list = useListUrlState(listConfig);
  const { values, sort, cursor, selectedId, limit } = list;

  const query = useCursorList<WorkOrder>({
    queryKey: ['dev', 'work-orders', plantId],
    filters: values,
    sort,
    cursor,
    limit,
    enabled: plantId !== null,
    fetchPage: async (request, signal) => {
      const { data } = await apiClient.GET('/api/v1/production/work-orders', {
        params: { query: toQuery(values, plantId!, request) },
        signal,
      });
      const page = data!.data;
      return {
        items: page.items,
        nextCursor: page.nextCursor ?? null,
        hasMore: page.hasMore,
        asOf: page.asOf,
      };
    },
    onCursorSortMismatch: list.resetToFirstPage,
  });

  const columns = useMemo<GridColDef<WorkOrder>[]>(
    () => [
      { field: 'workOrderNumber', headerName: t('grid.columns.workOrderNumber'), width: 180, sortable: true },
      {
        field: 'status',
        headerName: t('grid.columns.status'),
        width: 130,
        sortable: true,
        valueFormatter: (value: WorkOrderStatus) => t(`grid.status.${value}`),
      },
      { field: 'plannedQuantity', headerName: t('grid.columns.plannedQuantity'), width: 120, type: 'number' },
      {
        field: 'completedQuantity',
        headerName: t('grid.columns.completedQuantity'),
        width: 120,
        type: 'number',
      },
      { field: 'plannedStartAt', headerName: t('grid.columns.plannedStartAt'), width: 200, sortable: true },
      { field: 'priority', headerName: t('grid.columns.priority'), width: 110, type: 'number' },
    ],
    [t],
  );

  const rows = query.data?.items ?? [];
  const settled = settledPage(query);
  const selected = rows.find((row) => String(row.workOrderId) === selectedId);

  return (
    <PageFrame title={t('grid.title')}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
          {t('grid.intro')}
        </Typography>
        <SearchPanel fields={fields} values={values} onSubmit={list.applyFilters} />
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {plantId === null ? (
            <Typography role="status" sx={{ p: 3 }}>
              {t('grid.noPlant')}
            </Typography>
          ) : (
            <ServerDataGrid<WorkOrder>
              ariaLabel={t('grid.ariaLabel')}
              columns={columns}
              rows={rows}
              getRowId={(row) => row.workOrderId}
              loading={query.isLoading}
              refreshing={query.isFetching && !query.isLoading}
              error={query.error}
              onRetry={() => void query.refetch()}
              onResetFilters={() => list.applyFilters({})}
              sort={sort}
              defaultSort={listConfig.defaultSort}
              onSortChange={list.setSort}
              canPrev={list.canPrev}
              hasMore={settled?.hasMore ?? false}
              onPrev={list.prev}
              onNext={() => list.next(settled?.nextCursor ?? null)}
              selectedId={selectedId}
              onSelect={list.select}
              preferenceKey="dev.grid"
              asOfText={formatClock(settled?.asOf)}
            />
          )}
        </Box>
      </Box>
      <DetailDrawer
        open={selected !== undefined}
        title={selected ? t('grid.detailTitle', { number: selected.workOrderNumber }) : ''}
        onClose={() => list.select(null)}
      >
        {selected ? (
          <Box
            component="dl"
            sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, columnGap: 2 }}
          >
            {(['workOrderNumber', 'status', 'plannedQuantity', 'completedQuantity'] as const).map((key) => (
              <Box key={key} sx={{ display: 'contents' }}>
                <Typography component="dt" variant="body2" color="text.secondary">
                  {t(`grid.columns.${key}`)}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {String(selected[key])}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </DetailDrawer>
    </PageFrame>
  );
}
