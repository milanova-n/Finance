import { createTheme, type Theme } from '@mui/material/styles';
import { FONT_DISPLAY, FONT_UI } from './fonts';

type AppTokens = {
  canvas: string;
  canvasVeil: string;
  sunken: string;
  floating: string;
  lineStrong: string;
  textFaint: string;
  brand: {
    main: string;
    hover: string;
    wash: string;
    contrast: string;
  };
  leaf: { fill: string; rib: string };
  earn: { text: string; fill: string; wash: string };
  spend: { text: string; fill: string; wash: string };
  radius: { field: number; raised: number; floating: number };
  shadow: { raised: string; floating: string };
  ring: string;
};

const RADIUS = { field: 9, raised: 14, floating: 20 };

const lightTokens: AppTokens = {
  canvas: '#f4f8f4',
  canvasVeil: 'rgba(244, 248, 244, 0.86)',
  sunken: '#eaf1e9',
  floating: '#ffffff',
  lineStrong: '#c2d4bf',
  textFaint: '#83988c',
  brand: {
    main: '#0e6b45',
    hover: '#0a5537',
    wash: '#e4f2ea',
    contrast: '#ffffff',
  },
  leaf: { fill: '#7be0ac', rib: '#0e6b45' },
  earn: { text: '#0e6b45', fill: '#0e6b45', wash: '#e4f2ea' },
  spend: { text: '#9a5a12', fill: '#c9761a', wash: '#f7ecdf' },
  radius: RADIUS,
  shadow: {
    raised:
      '0 1px 2px rgba(12, 58, 38, 0.05), 0 3px 10px -3px rgba(12, 58, 38, 0.07)',
    floating:
      '0 2px 6px rgba(12, 58, 38, 0.06), 0 18px 40px -12px rgba(12, 58, 38, 0.22)',
  },
  ring: '0 0 0 3px rgba(14, 107, 69, 0.28)',
};

const darkTokens: AppTokens = {
  canvas: '#060f0b',
  canvasVeil: 'rgba(6, 15, 11, 0.86)',
  sunken: '#101f18',
  floating: '#14251c',
  lineStrong: '#2a4736',
  textFaint: '#6d8579',
  brand: {
    main: '#35c98a',
    hover: '#4ad79a',
    wash: '#122b20',
    contrast: '#04140d',
  },
  leaf: { fill: '#9ff3c6', rib: '#06301f' },
  earn: { text: '#35c98a', fill: '#0f9e7a', wash: '#122b20' },
  spend: { text: '#d19a45', fill: '#bd8430', wash: '#2b2011' },
  radius: RADIUS,
  shadow: {
    raised: '0 1px 2px rgba(0, 0, 0, 0.4), 0 3px 12px -4px rgba(0, 0, 0, 0.5)',
    floating:
      '0 2px 8px rgba(0, 0, 0, 0.5), 0 20px 44px -14px rgba(0, 0, 0, 0.7)',
  },
  ring: '0 0 0 3px rgba(53, 201, 138, 0.32)',
};

declare module '@mui/material/styles' {
  interface Theme {
    /** MyFi's own tokens, for anything MUI's palette has no slot for. */
    app: AppTokens;
  }
  interface ThemeOptions {
    app?: AppTokens;
  }
}

export type ThemeMode = 'light' | 'dark';

/** MUI wants exactly 25 elevation steps; MyFi only ever uses two. */
function buildShadows(tokens: AppTokens): Theme['shadows'] {
  const shadows = new Array(25).fill(tokens.shadow.raised);
  shadows[0] = 'none';
  for (let i = 8; i < 25; i += 1) shadows[i] = tokens.shadow.floating;
  return shadows as unknown as Theme['shadows'];
}

export function createAppTheme(mode: ThemeMode): Theme {
  const app = mode === 'dark' ? darkTokens : lightTokens;

  const text =
    mode === 'dark'
      ? { primary: '#e6f1e9', secondary: '#93aa9d', disabled: app.textFaint }
      : { primary: '#11201a', secondary: '#56685f', disabled: app.textFaint };

  const divider = mode === 'dark' ? '#1d3327' : '#d8e4d6';
  const paper = mode === 'dark' ? '#0d1a14' : '#ffffff';

  return createTheme({
    app,

    palette: {
      mode,
      primary: {
        main: app.brand.main,
        dark: app.brand.hover,
        light: app.brand.wash,
        contrastText: app.brand.contrast,
      },
      success: { main: app.earn.text },
      warning: { main: app.spend.text },
      error: { main: mode === 'dark' ? '#f0836a' : '#b4432f' },
      background: { default: app.canvas, paper },
      text,
      divider,
    },

    shape: { borderRadius: app.radius.field },

    shadows: buildShadows(app),

    typography: {
      fontFamily: FONT_UI,
      fontSize: 15,
      // Fraunces carries headings and figures; Instrument Sans does the rest.
      h1: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '-0.028em',
        lineHeight: 1.1,
      },
      h2: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '-0.026em',
        lineHeight: 1.12,
      },
      h3: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      },
      h4: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '-0.018em',
        lineHeight: 1.25,
      },
      h5: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '-0.018em',
      },
      h6: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        fontSize: '1.06rem',
        letterSpacing: '-0.018em',
      },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.55 },
      button: { textTransform: 'none', fontWeight: 500 },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased' },
          // Honour the OS setting rather than animating regardless.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          // MUI tints dark-mode paper with a gradient; MyFi sets its own.
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: app.radius.raised },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: app.radius.raised,
            border: `1px solid ${divider}`,
            boxShadow: app.shadow.raised,
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: true },
        styleOverrides: {
          root: {
            borderRadius: app.radius.field,
            padding: '9px 16px',
            // Only transform and colour animate — never `all`.
            transition:
              'transform 0.18s cubic-bezier(0.22,1,0.36,1), background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease',
            '&:active': { transform: 'translateY(1px)' },
            '&:focus-visible': { boxShadow: app.ring },
          },
          outlined: {
            borderColor: app.lineStrong,
            color: text.primary,
            '&:hover': {
              backgroundColor: app.sunken,
              borderColor: app.brand.main,
              color: app.brand.main,
            },
          },
          text: {
            color: text.secondary,
            '&:hover': { backgroundColor: app.sunken, color: text.primary },
          },
        },
      },

      MuiIconButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            borderRadius: app.radius.field,
            transition:
              'transform 0.18s cubic-bezier(0.22,1,0.36,1), color 0.18s ease, border-color 0.18s ease',
            '&:active': { transform: 'scale(0.94)' },
            '&:focus-visible': { boxShadow: app.ring },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: app.radius.field,
            backgroundColor: app.canvas,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: app.lineStrong,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: app.brand.main,
            },
            '&.Mui-focused': { backgroundColor: paper },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: app.brand.main,
            },
          },
          input: { padding: '10px 12px' },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '0.82rem', fontWeight: 500, color: text.secondary },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            height: 24,
            borderRadius: 999,
            fontSize: '0.8rem',
            backgroundColor: app.sunken,
            border: `1px solid ${divider}`,
            color: text.secondary,
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: divider, padding: '12px' },
          head: {
            fontSize: '0.8rem',
            fontWeight: 500,
            color: text.secondary,
            padding: '0 12px 8px',
            whiteSpace: 'nowrap',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: { transition: 'background-color 0.14s ease' },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: app.radius.floating,
            backgroundColor: app.floating,
            border: `1px solid ${divider}`,
            boxShadow: app.shadow.floating,
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: app.radius.field, border: '1px solid' },
        },
      },

      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: { root: { color: app.brand.main } },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: app.floating,
            color: text.primary,
            border: `1px solid ${divider}`,
            boxShadow: app.shadow.floating,
            fontSize: '0.8rem',
          },
        },
      },
    },
  });
}
