import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GridColDef } from '@mui/x-data-grid-premium';
import { AppProviders } from '@/app/providers/AppProviders';
import { ApiError } from '@/platform/api/ApiError';
import { ServerDataGrid, type ServerDataGridProps } from './ServerDataGrid';
import { fromSortModel, toSortModel } from './sortModel';

interface Row {
  id: number;
  name: string;
  status: string;
}
const columns: GridColDef<Row>[] = [
  { field: 'name', headerName: '이름', width: 160, sortable: true },
  { field: 'status', headerName: '상태', width: 120 },
];
const rows: Row[] = [
  { id: 1, name: 'WO-1', status: 'READY' },
  { id: 2, name: 'WO-2', status: 'IN_PROGRESS' },
];

function props(overrides: Partial<ServerDataGridProps<Row>> = {}): ServerDataGridProps<Row> {
  return {
    ariaLabel: '예제 목록',
    columns,
    rows,
    getRowId: (r) => r.id,
    sort: '-name',
    defaultSort: '-name',
    onSortChange: vi.fn(),
    canPrev: false,
    hasMore: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    selectedId: null,
    onSelect: vi.fn(),
    preferenceKey: 'test',
    virtualization: false,
    ...overrides,
  };
}

function renderGrid(p: ServerDataGridProps<Row>) {
  return render(
    <AppProviders>
      <div style={{ width: 800, height: 400 }}>
        <ServerDataGrid {...p} />
      </div>
    </AppProviders>,
  );
}

beforeEach(() => localStorage.clear());

describe('sortModel', () => {
  it('API sort 값과 DataGrid 모델이 서로 변환된다', () => {
    expect(toSortModel('name')).toEqual([{ field: 'name', sort: 'asc' }]);
    expect(toSortModel('-name')).toEqual([{ field: 'name', sort: 'desc' }]);
    expect(fromSortModel([{ field: 'name', sort: 'desc' }], 'x')).toBe('-name');
    expect(fromSortModel([{ field: 'name', sort: 'asc' }], 'x')).toBe('name');
    expect(fromSortModel([], 'x')).toBe('x');
  });
});

describe('ServerDataGrid', () => {
  it('행을 표시하고 page 번호나 전체 건수 없이 이전/다음과 표시 건수만 보여준다', async () => {
    renderGrid(props());
    const grid = await screen.findByRole('grid', { name: '예제 목록' });
    expect(within(grid).getByText('WO-1')).toBeInTheDocument();
    expect(within(grid).getByText('WO-2')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: '목록' });
    expect(within(nav).getByText(/2건 표시/)).toBeInTheDocument();
    expect(within(nav).getByText(/다음 페이지가 있습니다/)).toBeInTheDocument();
    expect(nav.textContent).not.toMatch(/전체|total|of \d+/i);
  });

  it('이전/다음 버튼은 cursor 상태에 따라 켜지고 호출된다', async () => {
    const p = props({ canPrev: true, hasMore: false });
    renderGrid(p);
    await userEvent.click(await screen.findByRole('button', { name: '이전' }));
    expect(p.onPrev).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByText(/마지막 페이지입니다/)).toBeInTheDocument();
  });

  it('첫 페이지에서는 이전이 꺼져 있다', async () => {
    renderGrid(props({ canPrev: false }));
    expect(await screen.findByRole('button', { name: '이전' })).toBeDisabled();
  });

  it('정렬 가능한 열을 누르면 서버 sort 변경을 요청하고 정렬 불가 열은 요청하지 않는다', async () => {
    const p = props();
    renderGrid(p);
    await userEvent.click(await screen.findByRole('columnheader', { name: /이름/ }));
    expect(p.onSortChange).toHaveBeenCalledWith('name');
    await userEvent.click(screen.getByRole('columnheader', { name: /상태/ }));
    expect(p.onSortChange).toHaveBeenCalledTimes(1);
  });

  it('행을 선택하면 id를 알리고 선택된 행을 표시한다', async () => {
    const p = props({ selectedId: '2' });
    renderGrid(p);
    const row2 = (await screen.findByText('WO-2')).closest('[role="row"]')!;
    expect(row2).toHaveClass('Mui-selected');
    await userEvent.click(screen.getByText('WO-1'));
    expect(p.onSelect).toHaveBeenCalledWith('1');
  });

  it('첫 조회 중에는 loading 문구를, 행이 없으면 empty를, 오류면 재시도를 보여준다', async () => {
    const view = renderGrid(props({ rows: [], loading: true }));
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중입니다');
    view.unmount();

    const reset = vi.fn();
    const empty = renderGrid(props({ rows: [], onResetFilters: reset }));
    expect(screen.getByText('조건에 맞는 항목이 없습니다')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(reset).toHaveBeenCalled();
    empty.unmount();

    const onRetry = vi.fn();
    renderGrid(
      props({
        error: new ApiError({ kind: 'network', status: null, code: 'NETWORK_ERROR', requestId: 'r-1' }),
        onRetry,
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('목록을 불러오지 못했습니다');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('이전 페이지에서 행이 비면(뒤로 가기 등) 빈 상태 대신 이전 이동을 남긴다', async () => {
    renderGrid(props({ rows: [], canPrev: true, hasMore: false }));
    expect(await screen.findByRole('button', { name: '이전' })).toBeEnabled();
  });

  it('새 조건을 조회하는 중에도 이전 행을 유지하고 갱신 중임을 알린다', async () => {
    renderGrid(props({ refreshing: true }));
    expect(await screen.findByText('WO-1')).toBeInTheDocument();
    expect(screen.getByText(/갱신 중/)).toBeInTheDocument();
  });

  it('열 너비와 숨김은 화면별 key로 localStorage에 저장하고 다음 화면에서 복원한다', async () => {
    localStorage.setItem('mes.grid.test', JSON.stringify({ hidden: ['status'], widths: { name: 222 } }));
    renderGrid(props());
    await screen.findByText('WO-1');
    expect(screen.queryByRole('columnheader', { name: /상태/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /이름/ })).toHaveStyle({ width: '222px' });
  });
});
