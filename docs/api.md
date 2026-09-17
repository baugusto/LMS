# API

> Base path: `/api`

## Autenticação
- Sessão baseada em cookie `ba_session`.
- Requisições autenticadas devem enviar cookies (`credentials: include`).

## Endpoints de Auth
| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Login com email/senha | Não |
| POST | `/api/auth/register` | Registro de usuário | Não |
| POST | `/api/auth/verify-email` | Validação de email | Não |
| POST | `/api/auth/logout` | Logout | Sim |
| GET | `/api/auth/google` | Inicia OAuth Google | Não |
| GET | `/api/auth/google/callback` | Callback OAuth Google | Não |
| GET | `/api/auth/me` | Retorna usuário da sessão | Sim |

## Endpoints LMS (Admin)
| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/lms/learning-paths` | Lista trilhas (admin) | ADMIN |
| POST | `/api/lms/learning-paths` | Cria trilha completa | ADMIN |
| GET | `/api/lms/learning-paths/:id` | Busca trilha por ID | ADMIN |
| PUT | `/api/lms/learning-paths/:id` | Atualiza trilha completa | ADMIN |
| DELETE | `/api/lms/learning-paths/:id` | Remove trilha | ADMIN |
| POST | `/api/lms/learning-paths/:id/topics` | Cria tópico | ADMIN |
| PUT | `/api/lms/learning-paths/topics/:topicId` | Atualiza tópico | ADMIN |
| DELETE | `/api/lms/learning-paths/topics/:topicId` | Remove tópico | ADMIN |
| POST | `/api/lms/learning-paths/topics/:topicId/resources` | Cria recurso | ADMIN |
| PUT | `/api/lms/learning-paths/resources/:resourceId` | Atualiza recurso | ADMIN |
| DELETE | `/api/lms/learning-paths/resources/:resourceId` | Remove recurso | ADMIN |
| GET | `/api/lms/partner-profiles` | Lista perfis de parceria | ADMIN |
| POST | `/api/lms/partner-profiles` | Cria perfil de parceria | ADMIN |
| PUT | `/api/lms/partner-profiles` | Atualiza perfil | ADMIN |
| DELETE | `/api/lms/partner-profiles` | Remove perfil | ADMIN |
| GET | `/api/lms/users` | Lista usuários | ADMIN |
| POST | `/api/lms/users` | Cria usuário | ADMIN |
| PATCH | `/api/lms/users` | Atualiza usuários em lote (empresa/perfis) | ADMIN |
| DELETE | `/api/lms/users` | Remove usuários em lote | ADMIN |
| PUT | `/api/lms/users/:id` | Atualiza usuário | ADMIN |
| DELETE | `/api/lms/users/:id` | Remove usuário | ADMIN |
| GET | `/api/lms/companies` | Lista empresas | ADMIN |
| POST | `/api/lms/companies` | Cria empresa | ADMIN |
| PUT | `/api/lms/companies` | Atualiza empresa | ADMIN |
| POST | `/api/lms/resources/upload` | Upload de arquivo (resource) | ADMIN |

## Endpoints LMS (Partner/Admin autenticado)
| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/lms/dashboard` | Dados do dashboard | Sim |
| POST | `/api/lms/enrollments` | Matricular usuário em trilha | Sim |
| POST | `/api/lms/progress` | Marcar recurso concluído | Sim |
| GET | `/api/lms/video-progress` | Obter progresso de vídeo | Sim |
| POST | `/api/lms/video-progress` | Salvar progresso de vídeo | Sim |
| GET | `/api/lms/quizzes/:resourceId` | Buscar quiz para usuário | Sim |
| POST | `/api/lms/quizzes/:resourceId` | Enviar respostas do quiz | Sim |
| GET | `/api/lms/resources/download/:fileKey` | Download de arquivo | Sim |

## Endpoints de Tracks (consumo)
| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/tracks/:id` | Detalhe de trilha para consumo | Sim |
| PATCH | `/api/tracks/:id/progress` | Marcar aula como concluída | Sim |
| POST | `/api/tracks/:id/reset` | Resetar progresso | Sim |
| POST | `/api/lms/tracks/:trackId/lessons/:lessonId/video-events` | Registrar evento de vídeo | Sim |

## Endpoints Admin adicionais
| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/admin/quizzes?resourceId=...` | Buscar quiz (admin) | ADMIN |
| POST | `/api/admin/quizzes` | Criar/atualizar quiz | ADMIN |
| GET | `/api/admin/translations` | Listar traduções | ADMIN |
| POST | `/api/admin/translations` | Criar/atualizar tradução | ADMIN |
| DELETE | `/api/admin/translations` | Remover tradução | ADMIN |
| GET | `/api/admin/reports/insights/learning-paths` | Insights por trilha | ADMIN |
| GET | `/api/admin/reports/insights/quizzes` | Insights de quizzes | ADMIN |
| GET | `/api/admin/reports/insights/user-risk` | Insights de risco de usuários | ADMIN |

## Erros comuns
- **401**: Não autenticado.
- **403**: Acesso negado (role insuficiente).
- **400**: Dados inválidos (Zod).
- **500**: Erro interno.
