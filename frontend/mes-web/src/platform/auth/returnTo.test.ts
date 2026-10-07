import { loginUrl, safeReturnTo } from './returnTo';

describe('safeReturnTo', () => {
  it.each(['/dev/a', '/dev/a?x=1#h', '/production/work-orders?status=READY'])(
    '앱 내부 경로 %s는 그대로 쓴다',
    (raw) => {
      expect(safeReturnTo(raw, '/')).toBe(raw);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example',
    'javascript:alert(1)',
    'dev/a',
    '/login',
    '/login?returnTo=%2Fdev%2Fa',
  ])('%s는 fallback으로 대체한다', (raw) => {
    expect(safeReturnTo(raw, '/home')).toBe('/home');
  });
});

describe('loginUrl', () => {
  it('원래 주소를 인코딩해 보존한다', () => {
    expect(loginUrl('/dev/a?x=1&y=2#h')).toBe('/login?returnTo=%2Fdev%2Fa%3Fx%3D1%26y%3D2%23h');
  });

  it('루트는 returnTo 없이 보낸다', () => {
    expect(loginUrl('/')).toBe('/login');
  });
});
