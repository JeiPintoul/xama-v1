import { defaultDesignTokens } from '@xama/design-tokens';
import themeCss from '@xama/design-tokens/theme.css?raw';
import { describe, expect, it } from 'vitest';

const tokenDeclarations = [
  ['--xama-color-background', defaultDesignTokens.color.background],
  ['--xama-color-surface', defaultDesignTokens.color.surface],
  ['--xama-color-surface-raised', defaultDesignTokens.color.surfaceRaised],
  ['--xama-color-text-primary', defaultDesignTokens.color.textPrimary],
  ['--xama-color-text-secondary', defaultDesignTokens.color.textSecondary],
  ['--xama-color-text-muted', defaultDesignTokens.color.textMuted],
  ['--xama-color-accent', defaultDesignTokens.color.accent],
  ['--xama-color-accent-foreground', defaultDesignTokens.color.accentForeground],
  ['--xama-color-border', defaultDesignTokens.color.border],
  ['--xama-color-success', defaultDesignTokens.color.success],
  ['--xama-color-warning', defaultDesignTokens.color.warning],
  ['--xama-color-danger', defaultDesignTokens.color.danger],
  ['--xama-radius-small', defaultDesignTokens.radius.small],
  ['--xama-radius-medium', defaultDesignTokens.radius.medium],
  ['--xama-radius-large', defaultDesignTokens.radius.large],
  ['--xama-spacing-small', defaultDesignTokens.spacing.small],
  ['--xama-spacing-medium', defaultDesignTokens.spacing.medium],
  ['--xama-spacing-large', defaultDesignTokens.spacing.large],
  ['--xama-font-sans', defaultDesignTokens.typography.fontSans],
] as const;

const normalizedThemeCss = themeCss.replace(/\s+/g, ' ');

describe('design tokens', () => {
  it.each(tokenDeclarations)('keeps %s aligned with the portable token values', (name, value) => {
    expect(normalizedThemeCss).toContain(`${name}: ${value};`);
  });
});
