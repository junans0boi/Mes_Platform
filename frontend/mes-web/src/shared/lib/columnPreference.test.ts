import { loadPreference, parsePreference, savePreference } from './columnPreference';

beforeEach(() => localStorage.clear());

describe('columnPreference', () => {
  it('저장하고 다시 읽는다', () => {
    savePreference('wo', { hidden: ['remark'], widths: { status: 140 } });
    expect(loadPreference('wo')).toEqual({ hidden: ['remark'], widths: { status: 140 } });
  });

  it('화면마다 따로 저장한다', () => {
    savePreference('a', { hidden: ['x'], widths: {} });
    expect(loadPreference('b')).toEqual({ hidden: [], widths: {} });
  });

  it.each([null, '', 'not json', '42', '"x"', 'null'])('깨진 값 %s은 빈 설정으로 대체한다', (raw) => {
    expect(parsePreference(raw)).toEqual({ hidden: [], widths: {} });
  });

  it('모양이 틀린 항목과 비정상 너비는 버린다', () => {
    expect(
      parsePreference(JSON.stringify({ hidden: ['a', 1, null], widths: { a: 100, b: 'x', c: 5, d: 99999 } })),
    ).toEqual({
      hidden: ['a'],
      widths: { a: 100 },
    });
  });

  it('localStorage를 쓸 수 없어도 오류를 내지 않는다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => savePreference('wo', { hidden: [], widths: {} })).not.toThrow();
    spy.mockRestore();
  });
});
