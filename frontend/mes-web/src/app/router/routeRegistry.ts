import type { ComponentType } from 'react';
import { ensureNamespace } from '@/platform/i18n';

// 라우트와 메뉴의 단일 기준. 메뉴 표시와 route guard는 이 metadata에서 함께 파생된다.
export interface RouteMetadata {
  path: string;
  /** i18n 키 (`namespace:key`). 문구는 컴포넌트가 아니라 리소스에 둔다. */
  titleKey: string;
  capability: string;
  module: string;
  icon?: 'signal' | 'table';
  /** 입력 손실 비용이 큰 작업형 화면만 true. 기본은 URL·Query cache로 복원한다. */
  preserveState?: boolean;
}

export interface RouteEntry {
  meta: RouteMetadata;
  /** i18n namespace를 먼저 올린 뒤 route chunk를 lazy loading한다. */
  load: () => Promise<{ default: ComponentType }>;
}

// ponytail: 아래 /dev/* 화면은 FE-03·FE-05 검증용 임시 route다. FE-06에서 실제 화면이 들어오면 제거한다.
export const routeRegistry: RouteEntry[] = [
  {
    meta: {
      path: '/dev/signals',
      titleKey: 'dev:signals.title',
      capability: 'Dev.Preview.Read',
      module: 'dev',
      icon: 'signal',
    },
    load: async () => {
      await ensureNamespace('dev');
      return import('@/modules/dev/SignalsPreviewPage');
    },
  },
  {
    meta: {
      path: '/dev/density',
      titleKey: 'dev:density.title',
      capability: 'Dev.Preview.Read',
      module: 'dev',
      icon: 'table',
    },
    load: async () => {
      await ensureNamespace('dev');
      return import('@/modules/dev/DensityPreviewPage');
    },
  },
  {
    meta: {
      path: '/dev/grid',
      titleKey: 'dev:grid.title',
      capability: 'Dev.Preview.Read',
      module: 'dev',
      icon: 'table',
    },
    load: async () => {
      await ensureNamespace('dev');
      return import('@/modules/dev/GridExamplePage');
    },
  },
];

export const homePath = routeRegistry[0]?.meta.path ?? '/';
