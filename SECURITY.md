# Política de segurança

## Reportar uma vulnerabilidade

Não abra uma issue pública para relatar vulnerabilidades, credenciais expostas ou possíveis vazamentos de dados. Use o canal privado de contato dos mantenedores do repositório e inclua passos para reproduzir, impacto e, quando possível, uma sugestão de correção.

## Escopo prioritário

- Autenticação, autorização e gerenciamento de sessão.
- Validação de entradas e uploads.
- Variáveis de ambiente, infraestrutura e dependências.
- Exposição de dados pessoais ou dados de produção.

## Boas práticas operacionais

- Revogue e substitua imediatamente qualquer segredo exposto.
- Mantenha dependências atualizadas e execute as verificações automatizadas antes de publicar alterações.
- Não versione arquivos `.env`, dumps de banco de dados ou diretórios de armazenamento de usuários.
