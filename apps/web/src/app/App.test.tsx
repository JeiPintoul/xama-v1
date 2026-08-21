import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';

describe('Xama foundation', () => {
  it('renders the branded placeholder through the application providers', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getByRole('img', { name: 'Xama' })).toHaveAttribute(
      'src',
      '/brand/xama-lockup.png',
    );
    expect(
      screen.getByRole('heading', { name: 'Um novo espaço para conversar.' }),
    ).toBeInTheDocument();
  });
});
