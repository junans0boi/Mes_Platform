import { formatClock } from './formatClock';

describe('formatClock', () => {
  it('UTC 시각을 시:분:초로 바꾼다', () => {
    expect(formatClock('2026-10-07T10:00:05Z')).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('없거나 해석할 수 없는 값은 그대로 둔다', () => {
    expect(formatClock(undefined)).toBeUndefined();
    expect(formatClock('not a date')).toBe('not a date');
  });
});
