# Xama

Projeto de plataforma web de comunicação para comunidades, com foco atual em **compartilhamento de tela e áudio em tempo real**. A versão publicada, **Quick Share**, permite criar uma sala temporária e convidar outras pessoas por código ou link, sem cadastro.

**[Acessar o Xama](https://xama-v1.pages.dev/)**

## Versão atual: Quick Share

A beta é utilizada por um grupo de amigos e evolui a partir de testes e solicitações reais de uso.

- Criação e entrada em salas temporárias por código.
- Presença dos participantes e múltiplas transmissões simultâneas.
- Escolha explícita das transmissões que deseja assistir.
- Controle independente de volume, mute e encerramento de cada visualização.
- Grade de transmissões, modo Foco, tela cheia e Picture-in-Picture quando suportado.
- Preferência de publicação em qualidade equilibrada ou alta.
- Interface responsiva para desktop e visualização em dispositivos móveis.

A captura de tela e áudio depende do navegador, do sistema operacional e da fonte selecionada. Chrome e Edge no desktop são o alvo principal para publicar transmissões.

## Tecnologias e arquitetura

| Camada | Tecnologias e responsabilidades |
| --- | --- |
| Interface | React, TypeScript, Vite, Tailwind CSS, React Router e TanStack Query. |
| Mídia em tempo real | LiveKit, com integração isolada na camada de sessão de mídia. |
| Emissão de tokens e criação de salas | Supabase Edge Functions; credenciais do LiveKit utilizadas somente no servidor. |
| Organização | Monorepo com pnpm, aplicação web e pacotes de domínio e design tokens. |
| Verificação | TypeScript, ESLint, Vitest, Testing Library e workflow de CI no GitHub Actions. |
| Publicação do frontend | Cloudflare Pages. |

O cliente solicita a conexão à Edge Function, que cria ou valida a sala e emite um token de acesso com escopo e validade limitados. O tráfego de mídia é transportado pelo LiveKit.

As transmissões remotas são assinadas quando o usuário escolhe assisti-las. Encerrar uma visualização remove sua assinatura de vídeo e áudio, preservando as demais transmissões em uso.

## Estado do projeto

A experiência publicada é o Quick Share. A estrutura de comunidades, canais e navegação adaptativa faz parte do desenvolvimento da plataforma completa e utiliza dados demonstrativos; não representa uma rede social completa já entregue.

O compartilhamento atual utiliza LiveKit. A integração com Cloudflare Realtime é explorada separadamente na branch `spike/cloudflare-realtime`.

A beta não inclui contas persistentes, histórico de salas ou comunidades armazenadas em banco de dados. Consulte [o estado atual](docs/CURRENT_STATE.md) e [o roadmap](docs/ROADMAP.md) para distinguir funcionalidades entregues de planos futuros.

## Executar localmente

### Requisitos

- Node.js 22.13.0 ou superior na linha 22, ou Node.js 24.
- Corepack e pnpm na versão definida pelo `package.json`.

Na raiz do repositório:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Crie um arquivo `.env.local` na raiz do repositório com o endpoint da sua própria Edge Function:

```dotenv
VITE_QUICK_ROOM_ENDPOINT=https://your-project.supabase.co/functions/v1/quick-room
```

A interface pode ser iniciada localmente, mas a conexão de mídia depende de uma instância configurada do LiveKit e da função `supabase/functions/quick-room` publicada no Supabase. Essa função utiliza `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` no ambiente do servidor.

O arquivo [`.env.example`](.env.example) também documenta o endpoint do fluxo anterior de desenvolvimento. Credenciais e códigos de acesso privados devem permanecer fora dos arquivos de ambiente do navegador e do Git.

### Verificações e build

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Documentação

- [Estado atual](docs/CURRENT_STATE.md)
- [Compartilhamento de tela e infraestrutura](docs/SCREEN_SHARE_ALPHA.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Produto](docs/PRODUCT.md)
- [Experiência de uso](docs/UX.md)
- [Roadmap](docs/ROADMAP.md)
