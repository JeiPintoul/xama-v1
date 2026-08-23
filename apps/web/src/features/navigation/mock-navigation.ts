import type { Channel, Community } from '@xama/domain';

const generalChannel: Channel = {
  id: 'geral',
  name: 'geral',
  description: 'O ponto de encontro para conversas, ideias e novidades da comunidade.',
  type: 'text',
};

const xamaLab: Community = {
  id: 'xama-lab',
  name: 'Xama Lab',
  description: 'Produto, jogos e café frio.',
  channels: [
    generalChannel,
    {
      id: 'produto',
      name: 'produto',
      description: 'Decisões, descobertas e próximos passos do produto.',
      type: 'text',
    },
    {
      id: 'intervalo',
      name: 'intervalo',
      description: 'Um espaço leve para assuntos fora da pauta.',
      type: 'text',
    },
    {
      id: 'lobby',
      name: 'Lobby',
      description: 'Uma sala aberta para conversar sem pauta.',
      type: 'voice',
    },
    {
      id: 'cafe',
      name: 'Café',
      description: 'Conversas rápidas durante uma pausa.',
      type: 'voice',
    },
  ],
};

const gameOn: Community = {
  id: 'game-on',
  name: 'Game On',
  description: 'Partidas, estratégia e resenha.',
  channels: [
    {
      id: 'saguao',
      name: 'saguão',
      description: 'Combine a próxima partida e encontre o grupo.',
      type: 'text',
    },
    {
      id: 'estrategia',
      name: 'estratégia',
      description: 'Táticas, composições e aprendizados da equipe.',
      type: 'text',
    },
    {
      id: 'clipes',
      name: 'clipes',
      description: 'Os melhores momentos das últimas partidas.',
      type: 'text',
    },
    {
      id: 'campeonatos',
      name: 'campeonatos',
      description: 'Calendário e organização das próximas competições.',
      type: 'text',
    },
    {
      id: 'lobby',
      name: 'Lobby',
      description: 'Ponto de encontro antes das partidas.',
      type: 'voice',
    },
    {
      id: 'ranked',
      name: 'Ranked',
      description: 'Sala para quem está jogando competitivo.',
      type: 'voice',
    },
    {
      id: 'afk',
      name: 'AFK',
      description: 'Um espaço silencioso para quem se afastou por alguns minutos.',
      type: 'voice',
    },
  ],
};

const clubeDoLivro: Community = {
  id: 'clube-do-livro',
  name: 'Clube do Livro',
  description: 'Leituras compartilhadas sem pressa.',
  channels: [
    {
      id: 'leitura-atual',
      name: 'leitura-atual',
      description: 'Converse sobre o livro do mês, sem spoilers fora do combinado.',
      type: 'text',
    },
    {
      id: 'indicacoes',
      name: 'indicações',
      description: 'Recomendações para as próximas leituras do grupo.',
      type: 'text',
    },
    {
      id: 'sala-de-leitura',
      name: 'Sala de leitura',
      description: 'Companhia tranquila para ler em conjunto.',
      type: 'voice',
    },
  ],
};

export const mockCommunities: readonly Community[] = [xamaLab, gameOn, clubeDoLivro];

export const defaultNavigation = {
  community: xamaLab,
  channel: generalChannel,
} as const;

export const mockCurrentUser = {
  id: 'current-user',
  displayName: 'João',
  handle: '@joaopaulo',
  initials: 'JP',
  favoriteChannelIdsByCommunity: {
    'xama-lab': ['geral', 'lobby'],
    'game-on': ['estrategia', 'ranked'],
    'clube-do-livro': [],
  },
} as const;
