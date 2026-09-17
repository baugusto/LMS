# Contribuindo para o LMS

## Antes de começar

- Use Node.js 20 e instale as dependências com `npm ci`.
- Crie `.env` a partir de `.env.example`; nunca envie arquivos de ambiente ou dados locais.
- Mantenha alterações pequenas, focadas e documentadas.

## Processo de mudança

1. Crie uma branch a partir de `main`.
2. Implemente a mudança e atualize a documentação relevante.
3. Execute `npm run lint`, `npm run typecheck` e `npm run build`.
4. Atualize a seção `Unreleased` do [CHANGELOG.md](CHANGELOG.md) quando a mudança for relevante para usuários, operação ou segurança.
5. Abra um pull request explicando o problema, a solução e como ela foi validada.

## Convenções

- Prefira TypeScript estrito e valide entradas externas com Zod. O lint possui um limite de avisos para a dívida legada; não aumente esse total.
- Não inclua credenciais, dumps de banco, uploads de usuários ou artefatos de build.
- Use mensagens de commit no imperativo, com escopo claro, por exemplo: `feat: adicionar filtro de trilhas`.
