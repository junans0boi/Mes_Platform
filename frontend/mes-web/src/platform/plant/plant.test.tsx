import { act, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/app/providers/AppProviders';
import { entry, renderApp } from '@/test/renderApp';
import { usePlant, type PlantContextValue } from './plantContext';

const seen: { latest: PlantContextValue | null } = { latest: null };
function Probe() {
  const value = usePlant();
  useEffect(() => {
    seen.latest = value;
  });
  return <p>{`plant:${value.plantId ?? 'none'}`}</p>;
}
const latest = () => seen.latest!;

function renderProbe(allowedPlantIds: number[]) {
  return render(
    <AppProviders
      initialSession={{ userId: 1, userName: 'u', displayName: null, allowedPlantIds, capabilities: [] }}
    >
      <Probe />
    </AppProviders>,
  );
}

beforeEach(() => localStorage.clear());

describe('Plant 선택', () => {
  it('저장된 선택이 없으면 허용된 첫 Plant를 쓴다', () => {
    renderProbe([5, 3]);
    expect(screen.getByText('plant:3')).toBeInTheDocument();
    expect(latest().allowedPlantIds).toEqual([3, 5]);
  });

  it('허용된 Plant만 선택할 수 있다', () => {
    renderProbe([3, 5]);
    let accepted = true;
    act(() => {
      accepted = latest().selectPlant(4);
    });
    expect(accepted).toBe(false);
    expect(screen.getByText('plant:3')).toBeInTheDocument();
    act(() => {
      accepted = latest().selectPlant(5);
    });
    expect(accepted).toBe(true);
    expect(screen.getByText('plant:5')).toBeInTheDocument();
    expect(localStorage.getItem('mes.plant')).toBe('5');
  });

  it('저장된 Plant가 허용 범위 밖이면 무시한다', () => {
    localStorage.setItem('mes.plant', '9');
    renderProbe([3, 5]);
    expect(screen.getByText('plant:3')).toBeInTheDocument();
  });

  it('허용된 Plant가 없으면 선택이 없다', () => {
    renderProbe([]);
    expect(screen.getByText('plant:none')).toBeInTheDocument();
    let accepted = true;
    act(() => {
      accepted = latest().selectPlant(1);
    });
    expect(accepted).toBe(false);
  });

  it('상단에서 허용된 Plant 사이를 전환한다', async () => {
    renderApp({
      registry: [entry('/dev/a', 'Dev.A.Read', 'a')],
      initialPath: '/dev/a',
      sessionOverrides: { allowedPlantIds: [2, 4] },
    });
    const banner = await screen.findByRole('banner');
    await userEvent.click(within(banner).getByRole('button', { name: /Plant 선택: Plant 2/ }));
    const menu = await screen.findByRole('menu', { name: 'Plant 선택' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['Plant 2', 'Plant 4']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Plant 4' }));
    expect(await within(banner).findByRole('button', { name: /Plant 선택: Plant 4/ })).toBeInTheDocument();
  });

  it('Plant가 하나뿐이면 선택 없이 표시만 하고, 없으면 안내한다', async () => {
    const view = renderApp({ registry: [entry('/dev/a', 'Dev.A.Read', 'a')], initialPath: '/dev/a' });
    const banner = await screen.findByRole('banner');
    expect(within(banner).getByText('Plant 1')).toBeInTheDocument();
    expect(within(banner).queryByRole('button', { name: /Plant 선택/ })).not.toBeInTheDocument();
    view.unmount();

    renderApp({
      registry: [entry('/dev/a', 'Dev.A.Read', 'a')],
      initialPath: '/dev/a',
      sessionOverrides: { allowedPlantIds: [] },
    });
    expect(await screen.findByText('접근 가능한 Plant 없음')).toBeInTheDocument();
  });
});
