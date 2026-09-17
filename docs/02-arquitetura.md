# Arquitetura

## Stack (com base no repositório)
| Camada | Tecnologia | Evidência |
| --- | --- | --- |
| Frontend/SSR | Next.js 15 (App Router) + React 18 + TypeScript | `package.json`, `src/web/app` |
| Estilo/UI | Tailwind CSS + Radix UI + Lucide Icons | `tailwind.config.ts`, `src/web/components/ui` |
| Backend | API Routes do Next.js | `src/web/app/api` |
| ORM | Prisma | `prisma/schema.prisma` |
| Banco de dados | PostgreSQL | `docker-compose.yml`, `prisma/schema.prisma` |
| Auth | JWT em cookie + Google OAuth | `src/server/auth/better-auth.ts` |
| i18n | next-intl + JSON + overrides no DB | `src/i18n`, `src/server/i18n/translation.service.ts` |
| Upload de arquivos | Busboy + filesystem local | `src/web/app/api/lms/resources/upload/route.ts` |
| Editor rico | Tiptap | `src/web/components/lms/RichTextEditor.tsx` |

## Organização de código
- **`src/web/app`**: páginas e layouts (App Router) com renderização server/client.
- **`src/web/components`**: componentes UI e de domínio (dashboard, tracks, quizzes).
- **`src/web/app/api`**: endpoints HTTP (Next.js API Routes).
- **`src/server`**: serviços, autenticação e validações.
- **`prisma/`**: schema, migrations e seed.
- **`docker/` e `swarm/`**: artefatos de deploy.

## Componentes principais
- **Web App (UI)**: dashboards de Admin e Partner.
- **API Routes**: CRUD de trilhas, usuários, empresas, relatórios, etc.
- **Serviços de domínio**: regras de negócio (learning paths, quizzes, relatórios).
- **Banco de dados**: PostgreSQL com Prisma.
- **Storage local**: arquivos em `storage/resources` (download via `/api/lms/resources/download/*`).

## Padrões adotados
- **Monólito modular**: UI e backend no mesmo app Next.js.
- **Camadas**: API Routes → Services → Prisma.
- **Autorização por papel**: `ADMIN` vs `PARTNER`.
- **I18n centralizado**: JSON base + overrides no banco.

## Integrações externas
- **Google OAuth**: login social.
- **Upstash Redis (opcional)**: rate limit de autenticação.
- **Provedores de conteúdo**: links externos (YouTube, Slides, etc.).

## Fluxo de autenticação/autorização
- **Sessão**: JWT assinado, armazenado em cookie `ba_session`.
- **Rotas admin**: protegidas por middleware e checks em API.
- **Login**: email/senha ou Google (callback + upsert de usuário).
- **Logout**: invalidação por incremento de `tokenVersion`.

## Logs, métricas e rastreamento
- **Logs**: `console.*` centralizado em `src/server/security/logger.ts`.
- **Métricas/Tracing**: TODO (informação pendente).

## Decisões arquiteturais (ADR light)
- Monólito com Next.js para reduzir complexidade de deploy.
- Prisma como ORM para consistência de schema e migrations.
- PostgreSQL como base relacional.
- JWT em cookie httpOnly para sessão.
- Google OAuth como opção de login social.
- Upload local em filesystem (necessita volume persistente no deploy).
- next-intl com overrides dinâmicos para tradução sem rebuild.
- Zod para validação de inputs nas APIs.
- Renderização server-side para páginas protegidas.
- Scripts de deploy e rollback via Docker Swarm.

