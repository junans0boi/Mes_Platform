import { act, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { useShellContext } from './shellContext';
import { renderApp, entry } from '@/test/renderApp';
import type { RouteEntry } from '@/app/router/routeRegistry';

type Handle = ReturnType<typeof useShellContext>;
let handle: Handle | null = null;

function Probe() {
  const h = useShellContext();
  useEffect(() => {
    handle = h;
  });
  return <p>probe</p>;
}

const registry: RouteEntry[] = [
  { ...entry('/dev/a', 'Dev.A.Read', 'a'), load: async () => ({ default: Probe }) },
];

const clock = /\d{1,2}:\d{2}(:\d{2})?/;

function liveText(root: HTMLElement) {
  return [...root.querySelectorAll('[role="status"], [role="alert"], [aria-live]')].map(
    (n) => n.textContent ?? '',
  );
}

describe('live region', () => {
  it('시계·경과 시간·건수는 live region에 들어가지 않고, 상태 전환만 알린다', async () => {
    renderApp({ registry, initialPath: '/dev/a' });
    await screen.findByText('probe');
    const banner = screen.getByRole('banner');

    act(() =>
      handle!.update({
        plantName: '천안1공장',
        connection: 'connected',
        asOfText: '10:42:08',
        asOfAgeSeconds: 12,
      }),
    );
    // 기준 시각이 화면에는 보이지만
    expect(within(banner).getByText(/10:42:08/)).toBeInTheDocument();
    // 어떤 live region에도 시계가 없다.
    for (const text of liveText(document.body)) expect(text).not.toMatch(clock);
    const beaconLive = () => document.querySelector('[data-live="beacon"]')!.textContent;
    expect(beaconLive()).toBe('전체 상태: 이상 없음');

    // 시계가 흘러도 live region 내용이 바뀌지 않는다.
    act(() => handle!.update({ asOfText: '10:42:09', asOfAgeSeconds: 13 }));
    for (const text of liveText(document.body)) expect(text).not.toMatch(clock);
    expect(beaconLive()).toBe('전체 상태: 이상 없음');

    // 같은 상태 안에서 건수만 바뀌어도 알림 문구는 그대로다(이상 3 → 4).
    act(() => handle!.update({ faultCount: 3 }));
    expect(beaconLive()).toBe('전체 상태: 이상 있음');
    act(() => handle!.update({ faultCount: 4 }));
    expect(beaconLive()).toBe('전체 상태: 이상 있음');

    // 연결 끊김은 alert로 알리고, 그 안에는 연결 상태 문구만 있다.
    act(() => handle!.update({ connection: 'disconnected', asOfText: '10:41:55', asOfAgeSeconds: 45 }));
    const alert = within(banner).getByRole('alert');
    expect(alert).toHaveTextContent('끊김');
    expect(alert.textContent).not.toMatch(clock);
    expect(alert.textContent).not.toMatch(/초 전/);
    for (const text of liveText(document.body)) expect(text).not.toMatch(clock);
  });
});
