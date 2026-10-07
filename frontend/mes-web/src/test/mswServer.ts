import { setupServer } from 'msw/node';
import { contractHandlers } from './contractMock';

// 기본 handler는 공유 계약(contracts/openapi.yaml)에서 만든다. 테스트별 변경은 server.use()로 한다.
export const server = setupServer(...contractHandlers());
