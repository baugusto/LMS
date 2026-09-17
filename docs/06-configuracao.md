# Configuração

## Variáveis de ambiente (aplicação)
| Nome | Exemplo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| DATABASE_URL | `postgresql://user:pass@host:5432/db` | Sim | String de conexão do PostgreSQL (validada por Zod). |
| BETTER_AUTH_SECRET | `min-16-chars-secret` | Sim | Segredo para assinar JWT de sessão. |
| APP_URL | `http://localhost:3000` | Não (tem default) | Base URL da aplicação. |
| NEXT_PUBLIC_APP_URL | `http://localhost:3000` | Não | Fallback para `APP_URL`. |
| APP_ENV | `development` / `production` | Não | Controla CSP e flags de segurança. |
| GOOGLE_CLIENT_ID | `xxx.apps.googleusercontent.com` | Não | OAuth Google. |
| GOOGLE_CLIENT_SECRET | `xxxxx` | Não | OAuth Google. |
| TRUST_PROXY | `true` | Não | Habilita leitura de IPs via headers no rate limit. |
| UPSTASH_REDIS_REST_URL | `https://...` | Não | Redis para rate limiting. |
| UPSTASH_REDIS_REST_TOKEN | `...` | Não | Token para Upstash Redis. |
| DISABLE_TRANSLATION_DB | `true` | Não | Desabilita overrides de tradução via DB. |
| FORCE_IPV4 | `true` | Não | Força resolução DNS IPv4 (OAuth Google). |

## Variáveis de ambiente (deploy - Docker/Swarm)
| Nome | Exemplo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| DOCKERHUB_USER | `sua-org` | Sim | Usuário do Docker Hub. |
| IMAGE_NAME | `lms` | Sim | Nome da imagem Docker. |
| STACK_NAME | `lms` | Sim | Nome do stack Swarm. |
| DOMAIN | `lms.exemplo.com` | Sim | Domínio público do app. |
| TRAEFIK_PUBLIC_NETWORK | `traefik-public` | Não | Rede externa do Traefik. |
| TRAEFIK_CERTRESOLVER | `letsencrypt` | Não | Resolver de TLS do Traefik. |
| TAG | `git-sha` | Não | Tag da imagem (auto se vazio). |
| PORT | `3000` | Não | Porta interna do app. |
| NODE_ENV | `production` | Não | Ambiente Node.js. |
| POSTGRES_DB | `botmaker_academy` | Sim (quando stack usa Postgres) | Nome do DB no container. |
| POSTGRES_USER | `postgres` | Sim (quando stack usa Postgres) | Usuário do DB. |
| POSTGRES_PASSWORD | `senha` | Sim (quando stack usa Postgres) | Senha do DB. |
| CREATE_ADMIN | `true/false` | Não | Cria/atualiza admin no deploy. |
| ADMIN_EMAIL | `admin@...` | Condicional | Necessário se `CREATE_ADMIN=true`. |
| ADMIN_PASSWORD | `...` | Condicional | Necessário se `CREATE_ADMIN=true`. |
| ADMIN_FIRST_NAME | `Admin` | Não | Nome do admin criado. |
| ADMIN_LAST_NAME | `Botmaker` | Não | Sobrenome do admin criado. |
| ADMIN_LOCALE | `pt` | Não | Locale do admin criado. |

## Configuração por ambiente
- **Dev**: usar `.env` com DB local e `APP_ENV=development`.
- **Prod**: usar `.env.production` + secrets reais.

