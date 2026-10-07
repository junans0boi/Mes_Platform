import { setupServer } from 'msw/node';

// 핸들러는 공유 계약(contracts/openapi.yaml)에서 만든다(FE-02). 지금은 비어 있다.
export const server = setupServer();
