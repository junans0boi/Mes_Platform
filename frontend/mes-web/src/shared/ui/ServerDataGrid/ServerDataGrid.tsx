import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {
  DataGridPremium,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridRowId,
  type GridValidRowModel,
  type GridRowSelectionModel,
} from '@mui/x-data-grid-premium';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@/platform/api/ApiError';
import { useUiSettings } from '@/platform/preferences/uiSettings';
import { loadPreference, savePreference, type ColumnPreference } from '../../lib/columnPreference';
import { OperationFeedback } from '../OperationFeedback';
import './licenseSetup';
import { fromSortModel, toSortModel } from './sortModel';

export interface ServerDataGridProps<TRow extends GridValidRowModel> {
  /** 화면 접근성 이름. 목록의 용도를 말한다(예: 작업지시 목록). */
  ariaLabel: string;
  columns: GridColDef<TRow>[];
  rows: TRow[];
  getRowId: (row: TRow) => GridRowId;
  /** 첫 조회 중(표시할 이전 행이 없을 때) */
  loading?: boolean;
  /** 이전 행을 유지한 채 새 조건을 조회하는 중 */
  refreshing?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  onResetFilters?: () => void;
  sort: string;
  defaultSort: string;
  onSortChange: (sort: string) => void;
  canPrev: boolean;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 열 설정 저장 key. 화면마다 고유해야 한다. */
  preferenceKey: string;
  asOfText?: string;
  toolbar?: ReactNode;
  /** 테스트(jsdom)처럼 크기를 측정할 수 없는 환경에서만 끈다. */
  virtualization?: boolean;
}

// cursor 목록 표시와 상호작용 경계. 업무 규칙·문구 조합·저장 프로시저는 알지 못하며 feature가 열과 행동을 주입한다.
// page 번호·전체 건수 없이 이전/다음만 제공하고, 정렬·필터는 서버가 한다.
export function ServerDataGrid<TRow extends GridValidRowModel>(props: ServerDataGridProps<TRow>) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const { settings } = useUiSettings();
  const [preference, setPreference] = useState<ColumnPreference>(() => loadPreference(props.preferenceKey));

  const columns = useMemo<GridColDef<TRow>[]>(
    () =>
      props.columns.map((column) => ({
        ...column,
        // 정렬은 서버가 허용한 열만 feature가 명시적으로 켠다.
        sortable: column.sortable ?? false,
        filterable: false,
        width: preference.widths[column.field] ?? column.width,
      })) as GridColDef<TRow>[],
    [props.columns, preference.widths],
  );
  const visibility = useMemo<GridColumnVisibilityModel>(
    () => Object.fromEntries(preference.hidden.map((field) => [field, false])),
    [preference.hidden],
  );
  const update = (next: ColumnPreference) => {
    setPreference(next);
    savePreference(props.preferenceKey, next);
  };

  const { error, rows, loading } = props;
  if (error) return <OperationFeedback state="error" error={error} onRetry={props.onRetry ?? (() => {})} />;
  if (loading && rows.length === 0) return <OperationFeedback state="loading" />;
  if (!loading && rows.length === 0 && !props.canPrev) {
    return <OperationFeedback state="empty" onReset={props.onResetFilters} />;
  }

  // URL의 선택 id는 문자열이고 행 id는 숫자일 수 있다. DataGrid는 행의 실제 id 타입으로 비교하므로 그 값을 찾아 쓴다.
  const selectedRow = rows.find((row) => String(props.getRowId(row)) === props.selectedId);
  const selection: GridRowSelectionModel = {
    type: 'include',
    ids: new Set(selectedRow === undefined ? [] : [props.getRowId(selectedRow)]),
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
      {props.toolbar ? <Box sx={{ px: 3, pb: 1 }}>{props.toolbar}</Box> : null}
      <Box sx={{ flex: 1, minHeight: 0, px: 3 }}>
        <DataGridPremium
          aria-label={props.ariaLabel}
          rows={rows}
          columns={columns}
          getRowId={props.getRowId}
          loading={props.refreshing === true}
          density={settings.density}
          // 서버가 정렬·필터·페이지를 맡는다. 클라이언트는 받은 행만 가상화해 그린다.
          sortingMode="server"
          filterMode="server"
          sortModel={toSortModel(props.sort)}
          sortingOrder={['asc', 'desc']}
          onSortModelChange={(model) => {
            const next = fromSortModel(model, props.defaultSort);
            if (next !== props.sort) props.onSortChange(next);
          }}
          hideFooter
          disableColumnFilter
          disableColumnMenu={false}
          disableMultipleRowSelection
          disableRowSelectionOnClick={false}
          rowSelectionModel={selection}
          onRowSelectionModelChange={(model) => {
            // 행이 바뀔 때 DataGrid가 보내는 빈 선택은 사용자의 해제가 아니다. 해제는 화면이 select(null)로 명시한다.
            const [first] = [...model.ids];
            if (first !== undefined) props.onSelect(String(first));
          }}
          columnVisibilityModel={visibility}
          onColumnVisibilityModelChange={(model) =>
            update({
              ...preference,
              hidden: Object.entries(model)
                .filter(([, visible]) => visible === false)
                .map(([field]) => field),
            })
          }
          onColumnWidthChange={(params) =>
            update({
              ...preference,
              widths: { ...preference.widths, [params.colDef.field]: Math.round(params.width) },
            })
          }
          disableVirtualization={props.virtualization === false}
          sx={{ border: `1px solid ${theme.mes.line}`, borderRadius: 0 }}
        />
      </Box>
      <Box
        role="navigation"
        aria-label={t('grid.label')}
        sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, color: theme.mes.inkMuted }}
      >
        <Button size="small" variant="outlined" onClick={props.onPrev} disabled={!props.canPrev}>
          {t('grid.prev')}
        </Button>
        <Button size="small" variant="outlined" onClick={props.onNext} disabled={!props.hasMore}>
          {t('grid.next')}
        </Button>
        <Typography variant="body2" aria-live="polite">
          {t('grid.pageInfo', { count: rows.length })}
          {props.hasMore ? ` · ${t('grid.moreAvailable')}` : ` · ${t('grid.lastPage')}`}
          {props.refreshing ? ` · ${t('grid.refreshing')}` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {props.asOfText ? (
          <Typography variant="body2">{t('grid.asOf', { time: props.asOfText })}</Typography>
        ) : null}
      </Box>
    </Box>
  );
}
