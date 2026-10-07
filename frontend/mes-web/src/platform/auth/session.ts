import type { components } from '@/platform/api/generated/schema';

// 서버 계약(SessionData)을 그대로 쓴다. 프론트가 같은 모양의 타입을 따로 만들지 않는다.
export type Session = components['schemas']['SessionData'];
