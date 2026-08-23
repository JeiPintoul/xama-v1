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

function getChannelRow(container: HTMLElement, accessibleName: string): HTMLElement {
  const row = within(container).getByRole('link', { name: accessibleName }).closest('div');

  if (!row) {
    throw new Error(`Channel row "${accessibleName}" was not found.`);
  }

  return row;
}

function chooseNavigationMode(container: HTMLElement, currentLabel: string, nextLabel: string) {
  const navigation = within(container);
  fireEvent.click(navigation.getByRole('button', { name: `Modo de navegação: ${currentLabel}` }));
  fireEvent.click(
    within(navigation.getByRole('menu', { name: 'Modos de navegação' })).getByRole(
      'menuitemradio',
      { name: nextLabel },
    ),
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

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const textChannelsSection = within(
      getSectionByHeading(communityNavigationElement, 'Canais de texto'),
    );
    fireEvent.click(
      textChannelsSection.getByRole('link', {
        name: 'Canal de texto estratégia, favorito',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'estratégia' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/communities/game-on/channels/estrategia');
    expect(
      textChannelsSection.getByRole('link', {
        name: 'Canal de texto estratégia, favorito',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('supports the custom mode menu and keyboard navigation between Modular sections', async () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const communityNavigation = within(communityNavigationElement);
    const modeTrigger = communityNavigation.getByRole('button', {
      name: 'Modo de navegação: Automático',
    });

    expect(communityNavigation.queryByRole('combobox')).not.toBeInTheDocument();
    expect(communityNavigation.getByText('Exibindo Simplificado')).toBeInTheDocument();
    expect(communityNavigation.queryByRole('tab')).not.toBeInTheDocument();

    fireEvent.click(modeTrigger);
    const modeMenu = communityNavigation.getByRole('menu', { name: 'Modos de navegação' });
    const automaticOption = within(modeMenu).getByRole('menuitemradio', {
      name: 'Automático',
    });
    const modularOption = within(modeMenu).getByRole('menuitemradio', { name: 'Modular' });

    expect(automaticOption).toHaveAttribute('aria-checked', 'true');
    fireEvent.scroll(modeMenu);
    expect(modeMenu).toBeInTheDocument();
    await waitFor(() => expect(automaticOption).toHaveFocus());
    fireEvent.keyDown(automaticOption, { key: 'End' });
    await waitFor(() => expect(modularOption).toHaveFocus());
    fireEvent.click(modularOption);

    const channelsTab = communityNavigation.getByRole('tab', { name: 'Canais' });
    const favoritesTab = communityNavigation.getByRole('tab', { name: 'Favoritos' });
    const voiceTab = communityNavigation.getByRole('tab', { name: 'Voz' });
    const activityTab = communityNavigation.getByRole('tab', { name: 'Atividade' });

    expect(channelsTab).toHaveAttribute('aria-selected', 'true');
    channelsTab.focus();
    fireEvent.keyDown(channelsTab, { key: 'ArrowRight' });

    expect(favoritesTab).toHaveFocus();
    expect(favoritesTab).toHaveAttribute('aria-selected', 'true');
    expect(
      communityNavigation.getByRole('link', { name: 'Canal de texto geral' }),
    ).toBeInTheDocument();
    expect(
      communityNavigation.getByRole('link', { name: 'Canal de voz Lobby' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(favoritesTab, { key: 'ArrowRight' });
    expect(voiceTab).toHaveFocus();
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');
    expect(
      communityNavigation.getByRole('link', { name: 'Canal de voz Café' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(voiceTab, { key: 'End' });

    expect(activityTab).toHaveFocus();
    expect(activityTab).toHaveAttribute('aria-selected', 'true');
    expect(communityNavigation.getByText('Nenhuma atividade para mostrar.')).toBeInTheDocument();

    chooseNavigationMode(communityNavigationElement, 'Modular', 'Simplificado');

    expect(communityNavigation.queryByRole('tab')).not.toBeInTheDocument();
    expect(
      communityNavigation.getByRole('heading', { name: 'Canais de texto' }),
    ).toBeInTheDocument();
    expect(communityNavigation.getByRole('heading', { name: 'Canais de voz' })).toBeInTheDocument();
  });

  it('preserves the active section when Automatic and Modular resolve identically', () => {
    renderAppAt('/communities/game-on/channels/saguao');

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const communityNavigation = within(communityNavigationElement);
    const voiceTab = communityNavigation.getByRole('tab', { name: 'Voz' });

    fireEvent.click(voiceTab);
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');

    chooseNavigationMode(communityNavigationElement, 'Automático', 'Modular');
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');

    chooseNavigationMode(communityNavigationElement, 'Modular', 'Automático');
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

    const textChannelsSection = getSectionByHeading(communityNavigationElement, 'Canais de texto');
    const productRow = getChannelRow(textChannelsSection, 'Canal de texto produto');

    fireEvent.contextMenu(productRow, { clientX: 180, clientY: 220 });
    fireEvent.click(
      within(communityNavigation.getByRole('menu', { name: 'Ações de canal produto' })).getByRole(
        'menuitem',
        { name: 'Adicionar aos favoritos' },
      ),
    );

    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de texto produto' }),
    ).toBeInTheDocument();
    expect(
      within(textChannelsSection).getByRole('link', {
        name: 'Canal de texto produto, favorito',
      }),
    ).toBeInTheDocument();

    fireEvent.contextMenu(getChannelRow(favoritesSection, 'Canal de texto produto'), {
      clientX: 180,
      clientY: 220,
    });
    fireEvent.click(
      within(communityNavigation.getByRole('menu', { name: 'Ações de canal produto' })).getByRole(
        'menuitem',
        { name: 'Remover dos favoritos' },
      ),
    );

    expect(
      within(favoritesSection).queryByRole('link', { name: 'Canal de texto produto' }),
    ).not.toBeInTheDocument();
    expect(
      within(textChannelsSection).getByRole('link', { name: 'Canal de texto produto' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        communityNavigation.getByRole('navigation', { name: 'Navegação de Xama Lab' }),
      ).toHaveFocus(),
    );

    const productLink = within(textChannelsSection).getByRole('link', {
      name: 'Canal de texto produto',
    });
    productLink.focus();
    fireEvent.keyDown(productLink, { key: 'F10', shiftKey: true });
    const keyboardMenuItem = within(
      communityNavigation.getByRole('menu', { name: 'Ações de canal produto' }),
    ).getByRole('menuitem', { name: 'Adicionar aos favoritos' });
    await waitFor(() => expect(keyboardMenuItem).toHaveFocus());
    fireEvent.keyDown(keyboardMenuItem, { key: 'Escape' });
    await waitFor(() => expect(productLink).toHaveFocus());

    const voiceChannelsSection = getSectionByHeading(communityNavigationElement, 'Canais de voz');
    const coffeeRow = getChannelRow(voiceChannelsSection, 'Canal de voz Café');

    fireEvent.contextMenu(coffeeRow, { clientX: 180, clientY: 320 });
    fireEvent.click(
      within(communityNavigation.getByRole('menu', { name: 'Ações de canal Café' })).getByRole(
        'menuitem',
        { name: 'Adicionar aos favoritos' },
      ),
    );

    expect(
      within(favoritesSection).getByRole('link', { name: 'Canal de voz Café' }),
    ).toBeInTheDocument();
    expect(
      within(voiceChannelsSection).getByRole('link', {
        name: 'Canal de voz Café, favorito',
      }),
    ).toBeInTheDocument();

    fireEvent.contextMenu(coffeeRow, { clientX: 180, clientY: 320 });
    fireEvent.click(
      within(communityNavigation.getByRole('menu', { name: 'Ações de canal Café' })).getByRole(
        'menuitem',
        { name: 'Remover dos favoritos' },
      ),
    );

    expect(
      within(favoritesSection).queryByRole('link', { name: 'Canal de voz Café' }),
    ).not.toBeInTheDocument();
    expect(
      within(voiceChannelsSection).getByRole('link', { name: 'Canal de voz Café' }),
    ).toBeInTheDocument();
  });

  it('does not restore an empty Modular Favorites tab after a mode change', () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    const communityNavigationElement = screen.getByTestId('desktop-community-navigation');
    const communityNavigation = within(communityNavigationElement);
    chooseNavigationMode(communityNavigationElement, 'Automático', 'Modular');

    const favoritesTab = communityNavigation.getByRole('tab', { name: 'Favoritos' });
    fireEvent.click(favoritesTab);
    chooseNavigationMode(communityNavigationElement, 'Modular', 'Simplificado');

    for (const channelName of ['geral', 'Lobby']) {
      const favoritesSection = getSectionByHeading(communityNavigationElement, 'Favoritos');
      const channelType = channelName === 'Lobby' ? 'voz' : 'texto';
      fireEvent.contextMenu(
        getChannelRow(favoritesSection, `Canal de ${channelType} ${channelName}`),
        { clientX: 180, clientY: 220 },
      );
      fireEvent.click(
        within(
          communityNavigation.getByRole('menu', {
            name: `Ações de canal ${channelName}`,
          }),
        ).getByRole('menuitem', { name: 'Remover dos favoritos' }),
      );
    }

    expect(
      communityNavigation.queryByRole('heading', { name: 'Favoritos' }),
    ).not.toBeInTheDocument();
    chooseNavigationMode(communityNavigationElement, 'Simplificado', 'Modular');

    expect(communityNavigation.queryByRole('tab', { name: 'Favoritos' })).not.toBeInTheDocument();
    const channelsTab = communityNavigation.getByRole('tab', { name: 'Canais' });
    expect(channelsTab).toHaveAttribute('aria-selected', 'true');
    expect(
      communityNavigation.getByRole('link', { name: 'Canal de texto geral' }),
    ).toBeInTheDocument();
  });

  it('keeps custom mobile mode and channel actions inside the open drawer', async () => {
    renderAppAt('/communities/xama-lab/channels/geral');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }));

    let mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    chooseNavigationMode(mobileNavigation, 'Automático', 'Modular');

    expect(screen.getByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
    expect(within(mobileNavigation).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('tab', { name: 'Canais' })).toBeInTheDocument();

    const productActionsButton = within(mobileNavigation).getByRole('button', {
      name: 'Ações de canal de texto produto',
    });
    productActionsButton.focus();
    fireEvent.click(productActionsButton);

    let favoriteMenuItem = within(
      within(mobileNavigation).getByRole('menu', { name: 'Ações de canal produto' }),
    ).getByRole('menuitem', { name: 'Adicionar aos favoritos' });
    fireEvent.keyDown(favoriteMenuItem, { key: 'Escape' });

    expect(screen.getByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
    expect(
      within(mobileNavigation).queryByRole('menu', { name: 'Ações de canal produto' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(productActionsButton).toHaveFocus());

    fireEvent.click(productActionsButton);
    favoriteMenuItem = within(
      within(mobileNavigation).getByRole('menu', { name: 'Ações de canal produto' }),
    ).getByRole('menuitem', { name: 'Adicionar aos favoritos' });
    fireEvent.click(favoriteMenuItem);

    expect(screen.getByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('link', {
        name: 'Canal de texto produto, favorito',
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(productActionsButton).toHaveFocus());

    const favoritesTab = within(mobileNavigation).getByRole('tab', { name: 'Favoritos' });
    fireEvent.click(favoritesTab);
    expect(favoritesTab).toHaveAttribute('aria-selected', 'true');
    expect(
      within(within(mobileNavigation).getByRole('tabpanel', { name: 'Favoritos' })).getByRole(
        'link',
        { name: 'Canal de texto produto' },
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Fechar navegação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }));

    mobileNavigation = screen.getByRole('dialog', { name: 'Navegação' });
    expect(
      within(mobileNavigation).getByRole('button', { name: 'Modo de navegação: Modular' }),
    ).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('tab', { name: 'Favoritos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      within(mobileNavigation).getByRole('link', { name: 'Canal de texto produto' }),
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
        name: 'Ações de canal de voz Café',
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
