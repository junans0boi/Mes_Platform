// access token은 JS 메모리에만 둔다. localStorage·sessionStorage·cookie에 쓰지 않으며 새로고침하면 사라진다.
// (silent refresh가 들어오기 전까지의 개발 중 한계이며 운영 최종안이 아니다. FE-13)
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
