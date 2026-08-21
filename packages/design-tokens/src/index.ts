export type DesignTokens = Readonly<{
  color: Readonly<{
    background: string;
    surface: string;
    surfaceRaised: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentForeground: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  }>;
  radius: Readonly<{
    small: string;
    medium: string;
    large: string;
  }>;
  spacing: Readonly<{
    small: string;
    medium: string;
    large: string;
  }>;
  typography: Readonly<{
    fontSans: string;
  }>;
}>;

export const defaultDesignTokens = {
  color: {
    background: 'oklch(0.145 0.012 270)',
    surface: 'oklch(0.185 0.015 270)',
    surfaceRaised: 'oklch(0.235 0.018 270)',
    textPrimary: 'oklch(0.97 0.005 260)',
    textSecondary: 'oklch(0.78 0.012 260)',
    textMuted: 'oklch(0.62 0.014 260)',
    accent: 'oklch(0.72 0.16 260)',
    accentForeground: 'oklch(0.16 0.02 270)',
    border: 'oklch(0.32 0.018 270)',
    success: 'oklch(0.75 0.16 150)',
    warning: 'oklch(0.82 0.16 80)',
    danger: 'oklch(0.66 0.21 25)',
  },
  radius: {
    small: '0.5rem',
    medium: '0.75rem',
    large: '1.25rem',
  },
  spacing: {
    small: '0.5rem',
    medium: '1rem',
    large: '1.5rem',
  },
  typography: {
    fontSans:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
} as const satisfies DesignTokens;
