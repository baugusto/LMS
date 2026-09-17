# Instalação

## Requisitos
- Node.js 20+ (baseado no `docker/Dockerfile`).
- npm (ou equivalente).
- PostgreSQL (local ou via Docker).
- Docker e Docker Compose (opcional, recomendado para banco local).

## Setup local passo a passo
1. Instale dependências:
   ```bash
   npm install
   ```

2. Suba o banco local (opcional):
   ```bash
   docker compose up -d
   ```

3. Crie o arquivo de ambiente local:
   ```bash
   cp .env.example .env
   ```
   Ajuste **ao menos** as variáveis abaixo:
   ```bash
   POSTGRES_PASSWORD=<gere-uma-senha-local-segura>
   DATABASE_URL=postgresql://postgres:<sua-senha-local>@localhost:5432/lms?schema=public
   BETTER_AUTH_SECRET=<gere-um-segredo-com-16-ou-mais-caracteres>
   APP_URL=http://localhost:3000
   APP_ENV=development
   ```

   Gere valores seguros, por exemplo, com `openssl rand -base64 32`. Não use uma senha padrão ou reutilizada.

4. Gere o client Prisma e rode migrations:
   ```bash
   npx prisma generate
   npm run prisma:migrate
   ```

5. (Opcional) Popular base com seed:
   ```bash
   npm run seed
   ```

6. Inicie a aplicação:
   ```bash
   npm run dev
   ```

## Modo produção (local)
```bash
npm run build
npm run start
```

## Checklist de validação
- [ ] App abre em `http://localhost:3000`.
- [ ] Login/admin funciona (`/login`).
- [ ] Dashboard carrega `/dashboard` após autenticação.
- [ ] `GET /api/auth/me` responde com usuário autenticado.
- [ ] CRUD de trilhas funciona no painel admin.

## Observações
- O healthcheck do deploy espera `/health` (não implementado no app). **TODO (informação pendente)**.
- A pasta `storage/resources` é usada para uploads; garanta persistência em produção.
