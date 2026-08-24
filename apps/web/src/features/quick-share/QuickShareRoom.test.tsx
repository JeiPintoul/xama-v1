import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';

describe('Quick Share route', () => {
  it('opens a dedicated room entry surface without the community shell', () => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/r/xk7p-4d2q');

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Sala XK7P-4D2Q' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seu nome')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-community-rail')).not.toBeInTheDocument();
  });
});
