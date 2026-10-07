import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/platform/i18n';
import { entry, renderApp } from '@/test/renderApp';

const registry = [entry('/dev/a', 'Dev.A.Read', 'a'), entry('/dev/b', 'Dev.B.Read', 'b')];

beforeAll(() => {
  i18n.addResourceBundle('ko', 'shell', { test: { a: '화면 에이', b: '화면 비' } }, true, true);
});

describe('AppShell', () => {
  it('route registry에서 메뉴를 만들고 lazy route를 Shell 안에 표시한다', async () => {
    renderApp({ registry, initialPath: '/dev/a' });
    expect(await screen.findByText('a 화면')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', { name: '개발 확인' }),
    );
    const menu = await screen.findByRole('menu', { name: '개발 확인' });
    expect(within(menu).getByRole('menuitem', { name: '화면 에이' })).toHaveClass('Mui-selected');
    expect(within(menu).getByRole('menuitem', { name: '화면 비' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '본문으로 이동' })).toBeInTheDocument();
  });

  it('capability가 없는 화면은 메뉴에서 숨기고 직접 접근하면 403 화면을 보여준다', async () => {
    renderApp({ registry, initialPath: '/dev/b', capabilities: { has: (c) => c === 'Dev.A.Read' } });
    expect(await screen.findByText('이 화면을 볼 권한이 없습니다')).toBeInTheDocument();
    expect(screen.getByText(/Dev\.B\.Read/)).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', { name: '개발 확인' }),
    );
    const menu = await screen.findByRole('menu', { name: '개발 확인' });
    expect(within(menu).queryByRole('menuitem', { name: '화면 비' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: '화면 에이' })).toBeInTheDocument();
  });

  it('알 수 없는 주소는 Shell 안에서 안내한다', async () => {
    renderApp({ registry, initialPath: '/dev/none' });
    expect(await screen.findByText('화면을 찾을 수 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument();
  });

  it('부트스트랩이 실패하면 Shell 골격 위에 재시도를 보여주고 재시도로 복구한다', async () => {
    let calls = 0;
    renderApp({
      registry,
      initialPath: '/dev/a',
      bootstrap: async () => {
        calls += 1;
        if (calls === 1) throw Object.assign(new Error('boom'), { requestId: 'req-1' });
      },
    });
    expect(await screen.findByText('시작 정보를 불러오지 못했습니다')).toBeInTheDocument();
    expect(screen.getByText(/req-1/)).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('a 화면')).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('화면이 둘 이상 열리면 탭이 나타나고, 현재 탭을 닫으면 이웃 탭으로 이동한다', async () => {
    renderApp({ registry, initialPath: '/dev/a' });
    await screen.findByText('a 화면');
    expect(screen.queryByRole('navigation', { name: '열린 화면' })).not.toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', { name: '개발 확인' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: '화면 비' }));
    await screen.findByText('b 화면');
    const tabs = screen.getByRole('navigation', { name: '열린 화면' });
    expect(within(tabs).getAllByRole('link')).toHaveLength(2);
    await userEvent.click(within(tabs).getByRole('button', { name: '화면 비 닫기' }));
    await waitFor(() => expect(screen.getByText('a 화면')).toBeInTheDocument());
    // 화면이 하나로 줄면 탭 줄은 사라진다.
    expect(screen.queryByRole('navigation', { name: '열린 화면' })).not.toBeInTheDocument();
  });

  it('UI 설정은 localStorage에 저장되지만 토큰·민감정보 키는 쓰지 않는다', async () => {
    renderApp({ registry, initialPath: '/dev/a' });
    await screen.findByText('a 화면');
    await userEvent.click(screen.getByRole('button', { name: '표시 설정' }));
    await userEvent.click(await screen.findByRole('button', { name: '여유 있게' }));
    const saved = JSON.parse(localStorage.getItem('mes.ui') ?? '{}') as Record<string, unknown>;
    expect(saved.density).toBe('comfortable');
    const keys = Object.keys(localStorage).join(',').toLowerCase();
    expect(keys).not.toMatch(/token|password|secret/);
  });
});
