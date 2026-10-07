import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RouteEntry } from '../router/routeRegistry';
import { homePath } from '../router/routeRegistry';

export interface WorkspaceTab {
  path: string;
  /** 탭으로 돌아갈 때 쓰는 주소(검색 조건 등 URL 상태 포함). */
  to: string;
  titleKey: string;
}

// 탭은 방문한 registry 화면의 URL 목록이다. 화면 인스턴스를 유지하지 않고(KeepAlive 없음) URL·Query cache로 복원한다.
// ponytail: 탭 목록은 메모리에만 둔다(새로고침하면 현재 화면 하나로 시작). 유지가 필요하면 sessionStorage로 확장한다.
export function useWorkspaceTabs(registry: RouteEntry[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [seen, setSeen] = useState<string | null>(null);

  // 위치가 바뀌었을 때 렌더 중에 탭 목록을 맞춘다(effect에서 setState를 하지 않는 React 권장 방식).
  const entry = registry.find((r) => r.meta.path === location.pathname);
  const to = location.pathname + location.search;
  if (entry && seen !== to) {
    setSeen(to);
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.path === entry.meta.path);
      if (i === -1) return [...prev, { path: entry.meta.path, to, titleKey: entry.meta.titleKey }];
      return prev.map((t, k) => (k === i ? { ...t, to } : t));
    });
  }

  const close = useCallback(
    (path: string) => {
      const index = tabs.findIndex((t) => t.path === path);
      const next = tabs.filter((t) => t.path !== path);
      setTabs(next);
      if (location.pathname === path) {
        const target = next[Math.min(index, next.length - 1)];
        void navigate(target?.to ?? homePath);
      }
    },
    [tabs, location.pathname, navigate],
  );

  return { tabs, activePath: location.pathname, close };
}
