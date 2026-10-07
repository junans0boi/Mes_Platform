// 401 공통 처리. 동시에 여러 요청이 401을 받아도 로그인 이동은 한 번만 일어나도록 한 번 알리고 잠근다.
// 다음 로그인이 성공하면(rearm) 다시 알릴 수 있다.
type Listener = () => void;

const listeners = new Set<Listener>();
let armed = true;

export const unauthorizedBus = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  report(): void {
    if (!armed) return;
    armed = false;
    for (const listener of [...listeners]) listener();
  },
  rearm(): void {
    armed = true;
  },
};
