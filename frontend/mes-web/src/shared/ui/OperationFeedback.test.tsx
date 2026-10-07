import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/app/providers/AppProviders';
import { ApiError, type ApiErrorKind } from '@/platform/api/ApiError';
import { OperationFeedback } from './OperationFeedback';

function renderIn(ui: React.ReactNode) {
  return render(<AppProviders>{ui}</AppProviders>);
}

describe('OperationFeedback', () => {
  it('loading은 접근 가능한 상태 문구를 가진다', () => {
    renderIn(<OperationFeedback state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중입니다');
  });

  it('empty는 이유와 다음 행동(초기화)을 말한다', async () => {
    const onReset = vi.fn();
    renderIn(<OperationFeedback state="empty" onReset={onReset} />);
    expect(screen.getByRole('status')).toHaveTextContent('조건에 맞는 항목이 없습니다');
    await userEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('error는 원인 문장·요청 번호·재시도를 제공한다', async () => {
    const onRetry = vi.fn();
    const error = new ApiError({
      kind: 'server',
      status: 500,
      code: 'UNEXPECTED_ERROR',
      requestId: 'req-1',
      operationId: 'op-1',
    });
    renderIn(<OperationFeedback state="error" error={error} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('목록을 불러오지 못했습니다');
    expect(screen.getByText(/서버에서 오류가 발생했습니다/)).toBeInTheDocument();
    expect(screen.getByText(/req-1 \/ op-1/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it.each([
    ['network', /서버에 연결하지 못했습니다/],
    ['forbidden', /권한이 없습니다/],
    ['notFound', /찾을 수 없습니다/],
    ['unauthorized', /로그인이 필요합니다/],
  ] satisfies [ApiErrorKind, RegExp][])('%s 오류는 종류에 맞는 문장을 쓴다', (kind, text) => {
    renderIn(
      <OperationFeedback
        state="error"
        error={new ApiError({ kind, status: null, code: 'X', requestId: null })}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
