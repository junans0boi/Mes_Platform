import { createTheme, type Theme } from '@mui/material/styles';
import { fonts, layout, palettes, rowHeight, type ColorMode, type Density, type MesPalette } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    mes: MesPalette & { fonts: typeof fonts; rowHeight: number; layout: typeof layout };
  }
  interface ThemeOptions {
    mes?: Theme['mes'];
  }
}

// 그림자는 팝오버·메뉴(elevation 8)와 드로어(elevation 16)에만 허용한다.
const noShadows = Array.from({ length: 25 }, () => 'none') as unknown as Theme['shadows'];
noShadows[8] = '0 8px 24px rgba(13, 26, 36, 0.16)';
noShadows[16] = '-8px 0 24px rgba(13, 26, 36, 0.18)';

export function createMesTheme(mode: ColorMode, density: Density): Theme {
  const p = palettes[mode];
  const marker = layout.rowMarker;
  return createTheme({
    mes: { ...p, fonts, rowHeight: rowHeight[density], layout },
    palette: {
      mode,
      primary: { main: p.accent, contrastText: p.accentContrast },
      background: { default: p.surface, paper: p.surface },
      text: { primary: p.ink, secondary: p.inkMuted },
      divider: p.line,
      error: { main: p.status.fault.ink },
      warning: { main: p.status.delayed.ink },
      success: { main: p.status.ok.ink },
      info: { main: p.accent },
      action: { hover: p.subtle, selected: p.accentTint },
    },
    shape: { borderRadius: layout.radius },
    shadows: noShadows,
    typography: {
      fontFamily: fonts.sans,
      fontSize: 14,
      // 계층은 크기와 굵기로 만든다.
      h1: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
      h2: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      button: { fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    },
    transitions: { duration: { shortest: 100, shorter: 120, short: 150, standard: 150, complex: 150 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            backgroundColor: p.surface,
          },
          '*:focus-visible': { outline: `2px solid ${p.accent}`, outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiButton: {
        defaultProps: { disableElevation: true, size: 'small' },
        styleOverrides: {
          root: { minHeight: 30, paddingInline: 14 },
          outlined: {
            borderColor: p.lineStrong,
            color: p.ink,
            '&:hover': { borderColor: p.ink, backgroundColor: p.subtle },
          },
          text: { color: p.ink, '&:hover': { backgroundColor: p.subtle } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { color: p.inkMuted, '&:hover': { color: p.ink, backgroundColor: p.subtle } },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0, square: true },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      // 팝오버·메뉴는 그림자 + 가는 선으로 떠 있음을 표시한다(어두운 테마에서도 구분되도록 면을 한 단계 올린다).
      MuiPopover: {
        defaultProps: { elevation: 8 },
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? p.subtle : p.surface,
            border: `1px solid ${mode === 'dark' ? p.lineStrong : p.line}`,
          },
        },
      },
      MuiMenu: { defaultProps: { elevation: 8 } },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 36,
            fontSize: '0.875rem',
            '&.Mui-selected': { backgroundColor: p.accentTint, fontWeight: 700 },
            '&.Mui-selected:hover': { backgroundColor: p.accentTint },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: p.ink,
            color: p.surface,
            borderRadius: layout.radius,
            fontSize: '0.75rem',
          },
        },
      },
      MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: p.lineStrong } } },
      // 분절 선택 버튼: 테두리 상자 대신 면과 굵기로 현재 값을 표시한다.
      MuiToggleButtonGroup: { styleOverrides: { root: { gap: 2 } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: layout.radius,
            color: p.inkMuted,
            paddingInline: 12,
            fontWeight: 500,
            '&:hover': { backgroundColor: p.subtle },
            '&.Mui-selected': { backgroundColor: p.accentTint, color: p.ink, fontWeight: 700 },
            '&.Mui-selected:hover': { backgroundColor: p.accentTint },
          },
        },
      },
      // 표: 세로선 없음. 행 구분은 옅은 가로선, 머리글은 굵은 글자 + 아래 2px 잉크 선.
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${p.line}`,
            padding: '0 16px',
            fontSize: '0.8125rem',
            verticalAlign: 'middle',
          },
          head: {
            fontSize: '0.75rem',
            fontWeight: 700,
            color: p.inkMuted,
            backgroundColor: p.surface,
            borderBottom: `2px solid ${p.ink}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': { backgroundColor: p.subtle },
            // 선택: 연한 액센트 면 + 왼쪽 액센트 막대
            '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: p.accentTint },
            '&.Mui-selected > td:first-of-type': { boxShadow: `inset ${marker}px 0 0 ${p.accent}` },
            // 예외 행의 위치 표식(데이터 속성은 shared/ui/StatusBadge/rowSignal.ts가 붙인다)
            '&[data-row-signal="fault"] > td:first-of-type': {
              boxShadow: `inset ${marker}px 0 0 ${p.status.fault.ink}`,
            },
            '&[data-row-signal="delayed"] > td:first-of-type': {
              boxShadow: `inset ${marker}px 0 0 ${p.status.delayed.ink}`,
            },
          },
        },
      },
    },
  });
}
