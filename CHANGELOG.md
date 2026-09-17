# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui. O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento semântico.

## [Unreleased]

### Added

- Documentação de contribuição, segurança e validação contínua.
- Verificações automatizadas de lint, tipos e build no GitHub Actions.
- Licença MIT.

### Changed

- O projeto passou a se chamar LMS.
- A configuração de lint foi migrada para a CLI do ESLint.
- O PostgreSQL local exige senha fornecida por variável de ambiente.

### Security

- Dados locais do PostgreSQL foram excluídos do versionamento e do contexto de build Docker.
- Senha padrão do PostgreSQL removida da configuração de desenvolvimento.

## [0.1.0] - 2026-09-17

### Added

- Versão inicial do LMS, incluindo interface, API, persistência e infraestrutura de deploy.
