import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import { createMesTheme } from '@/app/theme/createMesTheme';
import i18n from '@/platform/i18n';
import { signalStates } from './signal';
import { StatusBadge } from './StatusBadge';

const wrap = (ui: React.ReactElement) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={createMesTheme('light', 'compact')}>{ui}</ThemeProvider>
    </I18nextProvider>,
  );

describe('StatusBadge', () => {
  it.each(signalStates)('%s 상태는 도형(svg)과 한국어 글자를 함께 표시한다', (state) => {
    const { container } = wrap(<StatusBadge state={state} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector(`[data-signal="${state}"]`)?.textContent).toBe(
      i18n.t(`common:signal.${state}`),
    );
  });

  it('도형만 보일 때도 접근 가능한 이름을 유지한다', () => {
    wrap(<StatusBadge state="fault" iconOnly />);
    expect(screen.getByRole('img', { name: '이상' })).toBeInTheDocument();
  });

  it('이상·지연이 앞에 오는 순서가 기본 순서다', () => {
    expect(signalStates.slice(0, 2)).toEqual(['fault', 'delayed']);
  });
});
