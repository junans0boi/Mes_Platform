import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AppProviders } from '@/app/providers/AppProviders';
import { SearchPanel } from './SearchPanel';
import type { SearchField, SearchValues } from './searchFields';

const fields: SearchField[] = [
  { type: 'text', key: 'prefix', labelKey: 'common:search.label' },
  {
    type: 'select',
    key: 'status',
    labelKey: 'common:grid.label',
    multiple: true,
    options: [
      { value: 'READY', labelKey: 'common:signal.ok' },
      { value: 'IN_PROGRESS', labelKey: 'common:signal.running' },
    ],
  },
  { type: 'dateRange', fromKey: 'from', toKey: 'to', labelKey: 'common:action.close' },
];

function Harness({ onApply, initial = {} }: { onApply: (v: SearchValues) => void; initial?: SearchValues }) {
  const [values, setValues] = useState<SearchValues>(initial);
  return (
    <AppProviders>
      <SearchPanel
        fields={fields}
        values={values}
        onSubmit={(v) => {
          setValues(v);
          onApply(v);
        }}
      />
    </AppProviders>
  );
}

describe('SearchPanel', () => {
  it('입력 중에는 적용하지 않고 검색을 눌러야 값을 돌려준다', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    await userEvent.type(screen.getByRole('textbox', { name: '검색 조건' }), 'WO-26');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(onApply).toHaveBeenCalledWith({ prefix: 'WO-26' });
  });

  it('Enter로도 검색한다', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    await userEvent.type(screen.getByRole('textbox', { name: '검색 조건' }), 'A{Enter}');
    expect(onApply).toHaveBeenCalledWith({ prefix: 'A' });
  });

  it('여러 선택과 기간을 값으로 돌려주고 빈 값은 보내지 않는다', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    await userEvent.click(screen.getByRole('combobox', { name: '목록' }));
    await userEvent.click(await screen.findByRole('option', { name: '정상' }));
    await userEvent.click(screen.getByRole('option', { name: '진행 중' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.type(screen.getByLabelText('닫기 시작'), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(onApply).toHaveBeenCalledWith({ status: ['READY', 'IN_PROGRESS'], from: '2026-10-01' });
  });

  it('초기화는 모든 입력을 비우고 빈 조건을 적용한다', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} initial={{ prefix: 'WO' }} />);
    expect(screen.getByRole('textbox', { name: '검색 조건' })).toHaveValue('WO');
    await userEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(onApply).toHaveBeenCalledWith({});
    expect(screen.getByRole('textbox', { name: '검색 조건' })).toHaveValue('');
  });

  it('적용된 조건이 밖에서 바뀌면(주소 복원 등) 입력란이 따라간다', () => {
    const { rerender } = render(
      <AppProviders>
        <SearchPanel fields={fields} values={{ prefix: 'A' }} onSubmit={() => {}} />
      </AppProviders>,
    );
    rerender(
      <AppProviders>
        <SearchPanel fields={fields} values={{ prefix: 'B' }} onSubmit={() => {}} />
      </AppProviders>,
    );
    expect(screen.getByRole('textbox', { name: '검색 조건' })).toHaveValue('B');
  });
});
