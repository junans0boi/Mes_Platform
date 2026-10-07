// 열 표시·너비 설정을 브라우저(localStorage)에 저장한다. 서버 저장은 범위 밖이다.
// 저장된 값은 신뢰하지 않고 모양을 검사한 뒤 쓴다.
export interface ColumnPreference {
  hidden: string[];
  widths: Record<string, number>;
}

export const emptyPreference: ColumnPreference = { hidden: [], widths: {} };
const prefix = 'mes.grid.';

export function parsePreference(raw: string | null): ColumnPreference {
  if (!raw) return emptyPreference;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return emptyPreference;
    const { hidden, widths } = value as { hidden?: unknown; widths?: unknown };
    return {
      hidden: Array.isArray(hidden) ? hidden.filter((h): h is string => typeof h === 'string') : [],
      widths:
        typeof widths === 'object' && widths !== null
          ? Object.fromEntries(
              Object.entries(widths).filter(
                (e): e is [string, number] =>
                  typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] >= 40 && e[1] <= 2000,
              ),
            )
          : {},
    };
  } catch {
    return emptyPreference;
  }
}

export function loadPreference(key: string): ColumnPreference {
  try {
    return parsePreference(localStorage.getItem(prefix + key));
  } catch {
    return emptyPreference;
  }
}

export function savePreference(key: string, preference: ColumnPreference): void {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(preference));
  } catch {
    // 저장하지 못해도 이번 화면에서는 설정이 유지된다.
  }
}
