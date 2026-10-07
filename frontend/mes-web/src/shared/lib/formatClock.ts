// 기준 시각(UTC ISO 문자열)을 현장 화면용 시:분:초로 바꾼다. 해석할 수 없으면 원문을 그대로 돌려준다.
export function formatClock(iso: string | undefined): string | undefined {
  if (iso === undefined) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
