export interface ColorTokens {
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textOnAccent: string;
  accent: string;
  danger: string;
  success: string;
  overlay: string;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface TypographyTokens {
  title: { fontSize: number; fontWeight: '600' | '700' };
  body: { fontSize: number; fontWeight: '400' };
  caption: { fontSize: number; fontWeight: '400' };
}

export interface RadiusTokens {
  sm: number;
  md: number;
  lg: number;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  radii: RadiusTokens;
}

const spacing: SpacingTokens = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

const typography: TypographyTokens = {
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
};

const radii: RadiusTokens = { sm: 4, md: 8, lg: 16 };

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    border: '#E2E4E9',
    text: '#14171F',
    textSecondary: '#5B6072',
    textOnAccent: '#FFFFFF',
    accent: '#2F6FED',
    danger: '#D1403C',
    success: '#23946B',
    overlay: 'rgba(20, 23, 31, 0.5)',
  },
  spacing,
  typography,
  radii,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0E1016',
    surface: '#181B24',
    border: '#2B2F3B',
    text: '#F2F3F6',
    textSecondary: '#9BA0B2',
    textOnAccent: '#FFFFFF',
    accent: '#6B9BFF',
    danger: '#F2726E',
    success: '#4FC895',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  spacing,
  typography,
  radii,
};
