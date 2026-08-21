import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function getSectionByHeading(container: HTMLElement, name: string): HTMLElement {
  const section = within(container).getByRole('heading', { name }).closest('section');

  if (!section) {
    throw new Error(`Section "${name}" was not found.`);
  }

  return section;
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

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const textChannelsSection = within(
      getSectionByHeading(communityNavigationElement, 'Canais de texto'),
    );
    fireEvent.click(textChannelsSection.getByRole('link', { name: 'Canal de texto estratégia' }));

    expect(await screen.findByRole('heading', { name: 'estratégia' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/communities/game-on/channels/estrategia');
    expect(
      textChannelsSection.getByRole('link', { name: 'Canal de texto estratégia' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('supports explicit modes and keyboard navigation between Modular sections', () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const communityNavigation = within(screen.getByTestId('desktop-community-navigation'));
    const modeSwitcher = communityNavigation.getByRole('combobox', { name: 'Modo' });

    expect(modeSwitcher).toHaveValue('automatic');
    expect(communityNavigation.getByText('Exibindo Simplificado')).toBeInTheDocument();
    expect(communityNavigation.queryByRole('tab')).not.toBeInTheDocument();

    fireEvent.change(modeSwitcher, { target: { value: 'modular' } });

    const channelsTab = communityNavigation.getByRole('tab', { name: 'Canais' });
    const voiceTab = communityNavigation.getByRole('tab', { name: 'Voz' });
    const activityTab = communityNavigation.getByRole('tab', { name: 'Atividade' });

    expect(channelsTab).toHaveAttribute('aria-selected', 'true');
    channelsTab.focus();
    fireEvent.keyDown(channelsTab, { key: 'ArrowRight' });

    expect(voiceTab).toHaveFocus();
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');
    expect(
      communityNavigation.getByRole('link', { name: 'Canal de voz Café' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(voiceTab, { key: 'End' });

    expect(activityTab).toHaveFocus();
    expect(activityTab).toHaveAttribute('aria-selected', 'true');
    expect(communityNavigation.getByText('Nenhuma atividade para mostrar.')).toBeInTheDocument();

    fireEvent.change(modeSwitcher, { target: { value: 'simplified' } });

    expect(communityNavigation.queryByRole('tab')).not.toBeInTheDocument();
    expect(
      communityNavigation.getByRole('heading', { name: 'Canais de texto' }),
    ).toBeInTheDocument();
    expect(communityNavigation.getByRole('heading', { name: 'Canais de voz' })).toBeInTheDocument();
  });

  it('preserves the active section when Automatic and Modular resolve identically', () => {
    renderAppAt('/communities/game-on/channels/saguao');

    const communityNavigation = within(screen.getByTestId('desktop-community-navigation'));
    const modeSwitcher = communityNavigation.getByRole('combobox', { name: 'Modo' });
    const voiceTab = communityNavigation.getByRole('tab', { name: 'Voz' });

    fireEvent.click(voiceTab);
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(modeSwitcher, { target: { value: 'modular' } });
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(modeSwitcher, { target: { value: 'automatic' } });
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');
  });

  it('adds and removes personal text and voice favorites immediately', async () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const communityNavigation = within(communityNavigationElement);
    const favoritesSection = getSectionByHeading(communityNavigationElement, 'Favoritos');

    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de texto geral' }),
    ).toBeInTheDocument();
    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de voz Lobby' }),
    ).toBeInTheDocument();

    fireEvent.click(
      communityNavigation.getByRole('button', {
        name: 'Adicionar canal de texto produto aos favoritos',
      }),
    );
    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de texto produto' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(favoritesSection).getByRole('button', {
        name: 'Remover canal de texto produto dos favoritos',
      }),
    );
    expect(
      within(favoritesSection).queryByRole('link', { name: 'Canal de texto produto' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        communityNavigation.getByRole('navigation', { name: 'Navegação de Xama Lab' }),
      ).toHaveFocus(),
    );

    fireEvent.click(
      communityNavigation.getByRole('button', {
        name: 'Adicionar canal de voz Café aos favoritos',
      }),
    );
    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de voz Café' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(favoritesSection).getByRole('button', {
        name: 'Remover canal de voz Café dos favoritos',
      }),
    );
    expect(
      within(favoritesSection).queryByRole('link', { name: 'Canal de voz Café' }),
    ).not.toBeInTheDocument();
  });

  it('keeps mobile mode and favorite interactions inside the open drawer', () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }));

    let mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    const modeSwitcher = within(mobileNavigation).getByRole('combobox', { name: 'Modo' });
    modeSwitcher.focus();
    fireEvent.change(modeSwitcher, { target: { value: 'modular' } });

    expect(screen.getByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
    expect(modeSwitcher).toHaveFocus();
    expect(within(mobileNavigation).getByRole('tab', { name: 'Canais' })).toBeInTheDocument();

    const favoriteProductButton = within(mobileNavigation).getByRole('button', {
      name: 'Adicionar canal de texto produto aos favoritos',
    });
    favoriteProductButton.focus();
    fireEvent.click(favoriteProductButton);

    expect(screen.getByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
    expect(favoriteProductButton).toHaveFocus();
    expect(
      within(getSectionByHeading(mobileNavigation, 'Favoritos')).getByRole('link', {
        name: 'Canal de texto produto',
      }),
    ).toBeInTheDocument();

    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Fechar navegação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }));

    mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    expect(within(mobileNavigation).getByRole('combobox', { name: 'Modo' })).toHaveValue('modular');
    expect(
      within(getSectionByHeading(mobileNavigation, 'Favoritos')).getByRole('link', {
        name: 'Canal de texto produto',
      }),
    ).toBeInTheDocument();
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
    expect(
      within(mobileNavigation).getByRole('button', {
        name: 'Adicionar canal de voz Café aos favoritos',
      }),
    ).toHaveFocus();
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
    fireEvent.click(
      within(mobileNavigation).getByRole('link', { name: 'Canal de texto indicações' }),
    );

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
