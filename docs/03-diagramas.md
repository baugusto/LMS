# Diagramas

## Contexto (C4 nível 1)

```mermaid
flowchart LR
  Admin[Admin] --> App[Botmaker Academy Web App]
  Partner[Parceiro] --> App

  App --> DB[(PostgreSQL)]
  App --> Storage[(Storage local /storage/resources)]
  App --> Google[Google OAuth]
  App --> Upstash[Upstash Redis opcional]
  App --> External[Recursos externos URLs de vídeo/documentos]
```

## Containers (C4 nível 2)

```mermaid
flowchart TB
  subgraph Browser[Browser]
    UI[UI React/Next.js]
  end

  subgraph NextApp[Next.js App Node.js]
    AppRouter[App Router + SSR/CSR]
    ApiRoutes[API Routes]
    Services[Serviços de domínio]
    Prisma[Prisma Client]
  end

  DB[PostgreSQL]
  Storage[storage/resources]
  Google[Google OAuth]

  UI <--> AppRouter
  AppRouter --> ApiRoutes
  ApiRoutes --> Services
  Services --> Prisma
  Prisma --> DB
  Services --> Storage
  ApiRoutes --> Google
```

## Componentes (nível lógico)

```mermaid
flowchart LR
  subgraph NextJS[Next.js App]
    UI[UI/Pages]
    Auth[Auth API + Session]
    LMS[LMS APIs]
    Reports[Reports APIs]
    I18n[i18n + Traduções]
    StorageAPI[Upload/Download de arquivos]
    Services[Services Layer]
  end

  UI --> Auth
  UI --> LMS
  UI --> Reports
  UI --> I18n
  LMS --> Services
  Reports --> Services
  Auth --> Services
  StorageAPI --> Services
  Services --> DB[PostgreSQL]
  StorageAPI --> FS[storage/resources]
```

## Sequência 1: Login com Google

```mermaid
sequenceDiagram
  participant U as Usuário
  participant B as Browser
  participant A as /api/auth
  participant G as Google OAuth
  participant DB as PostgreSQL

  U->>B: Clica "Entrar com Google"
  B->>A: GET /api/auth/google
  A->>G: Redirect para consentimento
  G->>B: Redirect com code
  B->>A: GET /api/auth/google/callback?code=...
  A->>G: Troca code por token
  A->>G: Busca perfil do usuário
  A->>DB: upsert do usuário
  A->>B: Set-Cookie ba_session + redirect /dashboard
```

## Sequência 2: Atualizar trilha (Admin)

```mermaid
sequenceDiagram
  participant Admin
  participant UI
  participant API as /api/lms/learning-paths/:id
  participant DB as PostgreSQL
  participant QuizAPI as /api/admin/quizzes

  Admin->>UI: Edita trilha e salva
  UI->>API: PUT (trilha + tópicos + recursos)
  API->>DB: Transaction update
  API-->>UI: 200 OK
  loop para cada recurso tipo QUIZ
    UI->>QuizAPI: POST quiz definition
    QuizAPI->>DB: upsert Quiz/Questions/Options
    QuizAPI-->>UI: 200 OK
  end
  UI-->>Admin: Redirect /admin/learning-paths
```

## Deploy (Docker Swarm + Traefik)

```mermaid
flowchart LR
  User[Usuário] --> DNS[DNS/HTTPS]

  subgraph Swarm[Docker Swarm Cluster]
    Traefik[Traefik Ingress]
    LMS[lms service Next.js]
    PG[(postgres_lms)]
    PGVol[(volume: lms-postgres-data)]
    FS[(storage/resources - TODO persistir volume)]
  end

  DNS --> Traefik --> LMS
  LMS --> PG --> PGVol
  LMS --> FS
```
