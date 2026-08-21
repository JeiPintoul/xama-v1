import type { Channel, Community } from '@xama/domain';

const generalChannel: Channel = {
  id: 'geral',
  name: 'geral',
  description: 'O ponto de encontro para conversas, ideias e novidades da comunidade.',
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
    },
    {
      id: 'intervalo',
      name: 'intervalo',
      description: 'Um espaço leve para assuntos fora da pauta.',
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
    },
    {
      id: 'estrategia',
      name: 'estratégia',
      description: 'Táticas, composições e aprendizados da equipe.',
    },
    {
      id: 'clipes',
      name: 'clipes',
      description: 'Os melhores momentos das últimas partidas.',
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
    },
    {
      id: 'indicacoes',
      name: 'indicações',
      description: 'Recomendações para as próximas leituras do grupo.',
    },
  ],
};

export const mockCommunities: readonly Community[] = [xamaLab, gameOn, clubeDoLivro];

export const defaultNavigation = {
  community: xamaLab,
  channel: generalChannel,
} as const;

export const mockCurrentUser = {
  displayName: 'João',
  handle: '@joaopaulo',
  initials: 'JP',
} as const;
