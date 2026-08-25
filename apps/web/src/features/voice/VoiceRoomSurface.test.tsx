import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';

describe('voice room surface', () => {
  it('presents the guest join flow for an alpha voice channel', () => {
    window.history.replaceState(null, '', '/communities/xama-lab/channels/lobby');

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getAllByRole('heading', { name: 'Lobby' })).toHaveLength(2);
    expect(screen.getByLabelText('Seu nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Código de acesso alpha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
