import {
  canGoPrev,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
  firstPage,
  fromUrlCursor,
  goNext,
  goPrev,
  MAX_PAGE_SIZE,
} from './cursorPaging';

describe('clampPageSize', () => {
  it('기본 50, 상한 200, 하한 1', () => {
    expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBe(50);
    expect(clampPageSize(500)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(200)).toBe(200);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(Number.NaN)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(12.9)).toBe(12);
  });
});

describe('cursor stack', () => {
  it('다음으로 가면 지나온 cursor를 쌓고, 이전으로 가면 그대로 되돌린다', () => {
    let s = goNext(firstPage, 'c1');
    s = goNext(s, 'c2');
    expect(s).toEqual({ cursor: 'c2', stack: [null, 'c1'] });
    s = goPrev(s);
    expect(s).toEqual({ cursor: 'c1', stack: [null] });
    s = goPrev(s);
    expect(s).toEqual({ cursor: null, stack: [] });
    expect(canGoPrev(s)).toBe(false);
  });

  it('다음 cursor가 없으면 움직이지 않는다', () => {
    expect(goNext(firstPage, null)).toBe(firstPage);
  });

  it('첫 페이지에서는 이전으로 갈 수 없다', () => {
    expect(goPrev(firstPage)).toBe(firstPage);
  });

  it('새로고침으로 stack을 잃으면 URL cursor에서 이어 보고 이전 이동은 첫 페이지로 대체한다', () => {
    const restored = fromUrlCursor('c7');
    expect(restored.stack).toEqual([]);
    expect(canGoPrev(restored)).toBe(true);
    expect(goPrev(restored)).toEqual({ cursor: null, stack: [] });
  });
});
