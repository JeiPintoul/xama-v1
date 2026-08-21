import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';

function renderAppAt(path: string) {
  window.history.replaceState(null, '', path);

  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

describe('responsive application shell', () => {
  it('switches communities and channels through meaningful routes', async () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const communityRail = within(screen.getByTestId('desktop-community-rail'));
    fireEvent.click(communityRail.getByRole('link', { name: 'Abrir comunidade Game On' }));

    expect(await screen.findByRole('heading', { name: 'saguão' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/communities/game-on/channels/saguao');
    expect(communityRail.getByRole('link', { name: 'Abrir comunidade Game On' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const communityNavigation = within(screen.getByTestId('desktop-community-navigation'));
    fireEvent.click(communityNavigation.getByRole('link', { name: 'estratégia' }));

    expect(await screen.findByRole('heading', { name: 'estratégia' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/communities/game-on/channels/estrategia');
    expect(communityNavigation.getByRole('link', { name: 'estratégia' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('closes temporary mobile navigation after selection and dismissal', async () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const menuButton = screen.getByRole('button', { name: 'Abrir navegação' });
    fireEvent.click(menuButton);

    let mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    const closeButton = within(mobileNavigation).getByRole('button', {
      name: 'Fechar navegação',
    });

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(mobileNavigation, { key: 'Tab', shiftKey: true });
    expect(within(mobileNavigation).getByRole('link', { name: 'intervalo' })).toHaveFocus();
    fireEvent.keyDown(mobileNavigation, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.click(
      within(mobileNavigation).getByRole('link', {
        name: 'Abrir comunidade Clube do Livro',
      }),
    );

    expect(screen.queryByRole('dialog', { name: 'Navegação' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'leitura-atual' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/communities/clube-do-livro/channels/leitura-atual');

    fireEvent.click(menuButton);
    mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    fireEvent.click(within(mobileNavigation).getByRole('link', { name: 'indicações' }));

    expect(screen.queryByRole('dialog', { name: 'Navegação' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'indicações' })).toBeInTheDocument();

    fireEvent.click(menuButton);
    mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    fireEvent.keyDown(mobileNavigation, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Navegação' })).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });

  it('supports bounded keyboard resizing for the desktop sidebar', () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const resizeHandle = screen.getByRole('separator', {
      name: 'Redimensionar navegação da comunidade',
    });

    expect(resizeHandle).toHaveAttribute('aria-valuenow', '272');

    fireEvent.keyDown(resizeHandle, { key: 'End' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '360');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '360');

    fireEvent.keyDown(resizeHandle, { key: 'Home' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '224');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '224');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '240');
  });
});
