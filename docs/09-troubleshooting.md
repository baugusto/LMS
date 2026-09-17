# Troubleshooting

## Sintomas comuns e soluções

### 1) Erro de conexão com o banco (P1001/P1000)
- **Causa provável**: `DATABASE_URL` incorreta ou Postgres indisponível.
- **Solução**: validar string de conexão e subir o banco (`docker compose up -d`).

### 2) Não autenticado (401) em APIs
- **Causa provável**: cookie `ba_session` ausente ou expirado.
- **Solução**: refazer login; verificar `BETTER_AUTH_SECRET` entre ambientes.

### 3) Login Google falha
- **Causa provável**: `GOOGLE_CLIENT_ID/SECRET` ausentes ou redirect URI inválida.
- **Solução**: conferir `APP_URL` e configurar OAuth no Google Cloud.

### 4) Erro ao atualizar trilha
- **Causa provável**: URL inválida em recursos ou validação Zod.
- **Solução**: garantir URL completa ou upload válido; revisar mensagens de erro na UI.

### 5) Download de arquivo retorna 404
- **Causa provável**: arquivo ausente em `storage/resources`.
- **Solução**: verificar persistência de volume e integridade do storage.

### 6) Healthcheck falha no deploy
- **Causa provável**: rota `/health` não implementada.
- **Solução**: criar rota ou ajustar healthcheck no stack.

### 7) Traduções dinâmicas não aparecem
- **Causa provável**: banco indisponível ou `DISABLE_TRANSLATION_DB=true`.
- **Solução**: verificar conexão e configuração de env.

