import { contrastRatio } from '@/shared/lib/contrast';
import { palettes, type ColorMode, type SignalState } from './tokens';

const modes: ColorMode[] = ['light', 'dark'];
const states: SignalState[] = ['ok', 'running', 'delayed', 'fault', 'idle'];

describe.each(modes)('색 토큰 대비 (%s)', (mode) => {
  const p = palettes[mode];

  it('본문 글자는 surface와 subtle에서 4.5:1 이상이다', () => {
    expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.ink, p.subtle)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.inkMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.inkMuted, p.subtle)).toBeGreaterThanOrEqual(4.5);
  });

  it('액센트는 surface와 선택 면에서 글자·UI 모두 충분하다', () => {
    expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accent, p.accentTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.ink, p.accentTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accentContrast, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('입력 경계선은 surface에서 3:1 이상이다', () => {
    expect(contrastRatio(p.lineStrong, p.surface)).toBeGreaterThanOrEqual(3);
  });

  it.each(states)('상태 %s: 글자는 tint와 surface 모두에서 4.5:1 이상이다', (state) => {
    const tone = p.status[state];
    expect(contrastRatio(tone.ink, tone.tint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tone.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('경광선의 예외 색은 surface에서 3:1 이상이다 (비글자 UI)', () => {
    expect(contrastRatio(p.beacon.delayed, p.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.beacon.fault, p.surface)).toBeGreaterThanOrEqual(3);
  });

  it('이상(fault)과 정상(ok)은 색뿐 아니라 밝기도 충분히 다르다 (색각 이상·흑백 보조 단서)', () => {
    const ok = contrastRatio(p.status.ok.ink, p.surface);
    const fault = contrastRatio(p.status.fault.ink, p.surface);
    expect(Math.max(ok, fault) / Math.min(ok, fault)).toBeGreaterThanOrEqual(1.2);
  });

  it('액센트는 상태 색(이상·지연·정상)과 구분되는 색조다', () => {
    const hue = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
        number,
        number,
        number,
      ];
      const max = Math.max(r, g, b);
      const d = max - Math.min(r, g, b);
      if (d === 0) return 0;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const a = hue(p.accent);
    for (const s of ['ok', 'delayed', 'fault'] as const) {
      const diff = Math.abs(a - hue(p.status[s].ink));
      expect(Math.min(diff, 360 - diff)).toBeGreaterThanOrEqual(40);
    }
  });
});
