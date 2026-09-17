# Operação e Deploy

## Build e artefatos
- Build padrão:
  ```bash
  npm run build
  ```
- Iniciar em produção:
  ```bash
  npm run start
  ```

## Deploy com Docker Swarm
Scripts disponíveis em `scripts/`:
- Build + push + deploy:
  ```bash
  ./scripts/deploy.sh
  ```
- Apenas build/push:
  ```bash
  ./scripts/deploy.sh --push-only
  ```
- Apenas deploy (sem build):
  ```bash
  ./scripts/deploy.sh --deploy-only
  ```

## Rollback
```bash
./scripts/rollback.sh <tag>
```

## Observabilidade
- **Logs**: `docker service logs -f <STACK>_lms`.
- **Métricas/Tracing**: TODO (informação pendente).

## Rotinas operacionais
- **Backups de banco**: usar `pg_dump` ou snapshots do volume `lms-postgres-data`.
- **Uploads**: arquivos ficam em `storage/resources` (precisa de volume persistente em produção). **TODO**.
- **Healthcheck**: Swarm espera `/health` (rota não existe). **TODO**.

