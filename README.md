# LMS

Aplicação full-stack para gestão de trilhas de aprendizagem, conteúdos e parceiros. É construída com Next.js, TypeScript, Prisma e PostgreSQL, com suporte a deploy em Docker Swarm e Traefik.

## Começar localmente

Pré-requisitos: Node.js 20, npm e Docker Compose (para o PostgreSQL local).

```bash
cp .env.example .env
# Defina POSTGRES_PASSWORD e BETTER_AUTH_SECRET no .env.
docker compose up -d
npm ci
npx prisma generate
npm run prisma:migrate
npm run dev
```

Para verificar a qualidade antes de abrir um pull request:

```bash
npm run lint
npm run typecheck
npm run build
```

Consulte o guia completo de [instalação](docs/05-instalacao.md) e [configuração](docs/06-configuracao.md).

## Documentação

- [Visão geral](docs/01-visao-geral.md) e [arquitetura](docs/02-arquitetura.md)
- [Diagramas](docs/03-diagramas.md) e [modelo de dados](docs/04-dados.md)
- [Operação e deploy](docs/07-operacao-e-deploy.md)
- [Segurança](docs/08-seguranca.md) e [troubleshooting](docs/09-troubleshooting.md)
- [API](docs/api.md) e [glossário](docs/11-glossario.md)
- [Changelog](CHANGELOG.md)

## Deploy

O deploy de produção usa Docker Swarm, Traefik e TLS. Copie `.env.example` para `.env.production`, preencha as variáveis de deploy e execute:

```bash
./scripts/deploy.sh
```

Há opções `--push-only` e `--deploy-only`; veja os detalhes no [guia operacional](docs/07-operacao-e-deploy.md).

## Contribuição e segurança

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de propor alterações. Vulnerabilidades não devem ser reportadas em issues públicas; siga [SECURITY.md](SECURITY.md).

## Licença

Distribuído sob a [Licença MIT](LICENSE).
