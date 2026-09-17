# Segurança

## Autenticação
- **JWT em cookie**: cookie `ba_session` assinado com `BETTER_AUTH_SECRET`.
- **Login**: email/senha ou Google OAuth.
- **Logout**: incrementa `tokenVersion` para invalidar sessões.

## Autorização
- **Roles**: `ADMIN` e `PARTNER`.
- **Middleware**: bloqueia `/admin` para usuários não-admin.
- **APIs**: validações explícitas em cada rota.

## Proteções implementadas
- **Rate limit** no login (Upstash ou memória local).
- **CSP e headers** definidos em `next.config.mjs`.
- **Validação de input** via Zod nas APIs.
- **Sanitização HTML** via DOMPurify (rich text).
- **Cookies**: `httpOnly`, `sameSite=lax`, `secure` em produção.

## OWASP Top 10 (estado atual)
- **A01 - Broken Access Control**: mitigado por middleware e checks em API.
- **A02 - Cryptographic Failures**: segredos em env, JWT assinado.
- **A03 - Injection**: mitigado por Prisma + Zod (validação de input).
- **A04 - Insecure Design**: TODO (revisão formal de ameaças).
- **A05 - Security Misconfiguration**: CSP/headers presentes, mas healthcheck ausente (TODO).
- **A06 - Vulnerable Components**: TODO (processo de patching/auditoria).
- **A07 - Identification & Auth Failures**: rate limit + email verification.
- **A08 - Software & Data Integrity Failures**: TODO (assinatura de artefatos).
- **A09 - Logging & Monitoring**: logs básicos apenas (TODO).
- **A10 - SSRF**: validações de URL para recursos; TODO (hardening completo).

## LGPD
- **Dados pessoais**: nome, email, whatsapp, empresa.
- **Base legal, retenção e auditoria**: TODO (informação pendente).

## Boas práticas de secrets
- Não versionar `.env` com segredos.
- Usar secrets de ambiente no deploy (Swarm/K8s/CI).
- O PostgreSQL local exige `POSTGRES_PASSWORD`; não há senha padrão no `docker-compose.yml`.
- A pasta `.postgres-data/` contém dados locais e é ignorada pelo Git e pelo contexto de build Docker.
