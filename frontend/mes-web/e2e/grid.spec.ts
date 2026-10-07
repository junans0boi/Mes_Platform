import { expect, test } from '@playwright/test';
import { gotoAuthed } from './support/auth';
import { mockWorkOrders } from './support/workOrders';

const gridName = '예제 작업지시 목록';

test('첫 페이지는 50건이고 다음·이전은 cursor를 따라 이동한다', async ({ page }) => {
  const seen = await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid');
  const grid = page.getByRole('grid', { name: gridName });
  await expect(grid).toBeVisible();
  await expect(page.getByText(/50건 표시/)).toBeVisible();
  await expect(page.getByRole('button', { name: '이전' })).toBeDisabled();
  expect(seen[0]!.params.get('limit')).toBe('50');
  expect(seen[0]!.params.get('plantId')).toBe('1');
  expect(seen[0]!.params.has('cursor')).toBe(false);

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page).toHaveURL(/cursor=-plannedStartAt%7C50/);
  await expect(page.getByRole('button', { name: '이전' })).toBeEnabled();
  expect(seen.at(-1)!.params.get('cursor')).toBe('-plannedStartAt|50');

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText(/20건 표시/)).toBeVisible();
  await expect(page.getByText(/마지막 페이지입니다/)).toBeVisible();
  await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();

  await page.getByRole('button', { name: '이전' }).click();
  await expect(page).toHaveURL(/cursor=-plannedStartAt%7C50/);
  await page.getByRole('button', { name: '이전' }).click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(page.getByRole('button', { name: '이전' })).toBeDisabled();
});

test('정렬을 바꾸면 cursor가 초기화되고 첫 페이지부터 다시 조회한다', async ({ page }) => {
  const seen = await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page).toHaveURL(/cursor=/);

  await page.getByRole('columnheader', { name: /작업지시번호/ }).click();
  await expect(page).toHaveURL(/sort=workOrderNumber/);
  await expect(page).not.toHaveURL(/cursor=/);
  await expect.poll(() => seen.at(-1)?.params.get('sort')).toBe('workOrderNumber');
  expect(seen.at(-1)!.params.has('cursor')).toBe(false);
  await expect(page.getByRole('button', { name: '이전' })).toBeDisabled();
});

test('URL을 복사해 열면 같은 조건·정렬·cursor·선택이 복원된다', async ({ page, context }) => {
  await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();

  await page.getByRole('textbox', { name: '작업지시번호 접두' }).fill('LOT-');
  await page.getByRole('button', { name: '검색' }).click();
  // 조건이 적용된 결과가 보인 뒤에 정렬을 바꾸고, 새 정렬의 응답이 온 뒤(다음이 켜진 뒤)에 이동한다.
  await expect(page.getByRole('gridcell', { name: /LOT-/ }).first()).toBeVisible();
  await page.getByRole('columnheader', { name: /작업지시번호/ }).click();
  await expect(page).toHaveURL(/sort=workOrderNumber/);
  // 오름차순 첫 행이 보이면 새 정렬의 응답이 반영된 것이다.
  await expect(page.getByRole('gridcell', { name: 'LOT-00001' })).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page).toHaveURL(/cursor=workOrderNumber%7C50/);
  await expect(page.getByRole('gridcell', { name: /LOT-00051/ })).toBeVisible();
  await page.getByRole('gridcell', { name: /LOT-/ }).first().click();
  await expect(page.getByRole('heading', { name: /LOT-.* 상세/ })).toBeVisible();

  const copied = new URL(page.url());
  expect(copied.searchParams.get('workOrderNumberPrefix')).toBe('LOT-');
  expect(copied.searchParams.get('sort')).toBe('workOrderNumber');
  expect(copied.searchParams.get('cursor')).toBe('workOrderNumber|50');
  expect(copied.searchParams.get('selected')).not.toBeNull();

  const other = await context.newPage();
  await mockWorkOrders(other);
  await gotoAuthed(other, copied.pathname + copied.search);
  // 선택한 행의 상세가 열려 있는 동안 뒤쪽 화면은 보조 기술에서 숨겨진다. 먼저 상세를 확인하고 닫는다.
  await expect(other.getByRole('heading', { name: /LOT-.* 상세/ })).toBeVisible();
  await other.keyboard.press('Escape');
  await expect(other.getByRole('textbox', { name: '작업지시번호 접두' })).toHaveValue('LOT-');
  await expect(other.getByRole('grid', { name: gridName })).toBeVisible();
  await expect(other).toHaveURL(/sort=workOrderNumber/);
  // 새로 열었으므로 이전 이동 기록은 없지만 이전은 첫 페이지로 대체된다.
  await expect(other.getByRole('button', { name: '이전' })).toBeEnabled();
  await other.getByRole('button', { name: '이전' }).click();
  await expect(other).not.toHaveURL(/cursor=/);
});

test('요청 limit은 200을 넘지 않는다', async ({ page }) => {
  const seen = await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid?limit=99999');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  expect(seen.length).toBeGreaterThan(0);
  for (const request of seen) expect(Number(request.params.get('limit'))).toBeLessThanOrEqual(200);
});

test('200행을 받아도 화면에는 일부 행만 그린다(가상화)', async ({ page }) => {
  await mockWorkOrders(page, { total: 400 });
  await gotoAuthed(page, '/dev/grid?limit=200');
  await expect(page.getByText(/200건 표시/)).toBeVisible();
  const rendered = await page.getByRole('grid', { name: gridName }).getByRole('row').count();
  expect(rendered).toBeGreaterThan(5);
  expect(rendered).toBeLessThan(80);
});

test('오류는 영역 안에 원인·요청 번호·재시도를 보여주고 재시도하면 복구된다', async ({ page }) => {
  await mockWorkOrders(page, { failFirstWith: 500 });
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByText('목록을 불러오지 못했습니다')).toBeVisible();
  await expect(page.getByText(/req-e2e-500/)).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
});

test('결과가 없으면 이유와 초기화 행동을 보여준다', async ({ page }) => {
  await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid?workOrderNumberPrefix=NONE');
  await expect(page.getByText('조건에 맞는 항목이 없습니다')).toBeVisible();
  await page.getByRole('button', { name: '초기화' }).last().click();
  await expect(page).not.toHaveURL(/workOrderNumberPrefix/);
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
});

test('서버가 cursor 불일치를 알리면 cursor를 버리고 첫 페이지를 다시 조회한다', async ({ page }) => {
  const seen = await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid?cursor=workOrderNumber%7C50');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  await expect(page).not.toHaveURL(/cursor=/);
  expect(seen[0]!.params.get('cursor')).toBe('workOrderNumber|50');
  expect(seen.at(-1)!.params.has('cursor')).toBe(false);
  await expect(page.getByRole('button', { name: '이전' })).toBeDisabled();
});

test('새 검색은 이전 요청을 취소하고 새 결과만 보여준다', async ({ page }) => {
  await mockWorkOrders(page, { slowPrefix: 'SLOW-', slowMs: 2000 });
  // 브라우저가 실제로 요청을 취소(AbortSignal)했는지 fetch 단계에서 관찰한다.
  await page.addInitScript(() => {
    const w = window as unknown as { __aborted: string[] };
    w.__aborted = [];
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (input instanceof Request && input.url.includes('workOrderNumberPrefix=SLOW-')) {
        input.signal.addEventListener('abort', () => w.__aborted.push(input.url));
      }
      return original(input, init);
    };
  });
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  const box = page.getByRole('textbox', { name: '작업지시번호 접두' });
  await box.fill('SLOW-');
  // 느린 요청이 실제로 나간 뒤에 새 검색을 한다(주소 변경과 요청 시작 사이에는 렌더링이 끼어 있다).
  const slowRequest = page.waitForRequest(/workOrderNumberPrefix=SLOW-/);
  await page.getByRole('button', { name: '검색' }).click();
  await slowRequest;
  await box.fill('FAST-');
  await page.getByRole('button', { name: '검색' }).click();

  await expect(page.getByRole('gridcell', { name: /FAST-/ }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __aborted: string[] }).__aborted.length), {
      message: JSON.stringify(
        await page.evaluate(() => (window as unknown as { __fetched: string[] }).__fetched),
      ),
    })
    .toBe(1);
  await page.waitForTimeout(2200);
  await expect(page.getByRole('gridcell', { name: /SLOW-/ })).toHaveCount(0);
});

test('열 너비와 숨김은 브라우저에 저장되어 다시 열어도 유지된다', async ({ page }) => {
  await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      'mes.grid.dev.grid',
      JSON.stringify({ hidden: ['priority'], widths: { workOrderNumber: 260 } }),
    ),
  );
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('columnheader', { name: /우선순위/ })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /작업지시번호/ })).toHaveCSS('width', '260px');
});

test('예제 화면 캡처', async ({ page }, testInfo) => {
  await mockWorkOrders(page);
  await gotoAuthed(page, '/dev/grid');
  await expect(page.getByRole('grid', { name: gridName })).toBeVisible();
  await expect(page.getByText(/50건 표시/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('grid-example-1366x768.png') });
});
