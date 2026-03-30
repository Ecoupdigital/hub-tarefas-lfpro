# EcoUP Hub - Schema do Banco de Dados (Supabase/PostgreSQL)

> Documento gerado para contexto de agentes AIOS. Ultima atualizacao: 2026-02-17

## Visao Geral

O schema segue o modelo inspirado no Monday.com:
```
Workspace → Board → Group → Item → ColumnValues (EAV)
```

Valores de celulas sao armazenados como JSON flexivel via pattern **Entity-Attribute-Value (EAV)** na tabela `column_values`.

## Tabelas Principais

### Hierarquia Core

#### workspaces
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| name | text | Nome do workspace |
| icon | text | Icone (emoji ou URL) |
| color | text | Cor do workspace |
| owner_id | uuid (FK profiles) | Dono do workspace |
| created_at | timestamptz | |

#### boards
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| workspace_id | uuid (FK workspaces) | |
| name | text | Nome do board |
| description | text | |
| state | text | 'active' / 'archived' / 'deleted' (soft delete) |
| owner_id | uuid (FK profiles) | |
| created_at | timestamptz | |

#### groups
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| title | text | |
| color | text | Cor do grupo |
| position | float8 | Posicao (Date.now() como float) |
| is_collapsed | boolean | |
| created_at | timestamptz | |

#### columns
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| title | text | Nome da coluna |
| type | text | Um dos 21 tipos suportados |
| width | int4 | Largura em pixels |
| position | float8 | |
| settings | jsonb | Labels de status, opcoes de dropdown, etc. |
| created_at | timestamptz | |

#### items
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| group_id | uuid (FK groups) | |
| name | text | Nome do item |
| position | float8 | |
| created_by | uuid (FK profiles) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### column_values (EAV)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| item_id | uuid (FK items) | |
| column_id | uuid (FK columns) | |
| value | jsonb | Valor flexivel (texto, array, objeto, etc.) |
| created_at | timestamptz | |

#### subitems
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| parent_item_id | uuid (FK items) | |
| name | text | |
| status | text | |
| person | text | |
| date | text | |
| position | float8 | |
| created_at | timestamptz | |

### Usuarios e Acesso

#### profiles
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK, FK auth.users) | |
| full_name | text | |
| avatar_url | text | |
| email | text | |
| updated_at | timestamptz | |

#### user_roles
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| user_id | uuid (FK profiles) | |
| role | app_role enum | admin, member, viewer, guest |

#### workspace_members
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| workspace_id | uuid (FK workspaces) | |
| user_id | uuid (FK profiles) | |
| role | text | Papel dentro do workspace |
| joined_at | timestamptz | |

#### board_permissions
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| user_id | uuid (FK profiles) | |
| permission_level | text | Nivel de permissao |
| granted_at | timestamptz | |

### Features Avancadas

#### updates (comentarios/atividades)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| item_id | uuid (FK items) | |
| author_id | uuid (FK profiles) | |
| body | text | Conteudo do comentario |
| is_pinned | boolean | |
| parent_id | uuid (FK updates, nullable) | Para threads |
| created_at | timestamptz | |

#### favorites
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| user_id | uuid (FK profiles) | |
| board_id | uuid (FK boards) | |
| created_at | timestamptz | |

#### activity_log
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid | |
| item_id | uuid | |
| user_id | uuid | |
| action | text | Tipo de acao |
| old_value | jsonb | Valor anterior |
| new_value | jsonb | Novo valor |
| created_at | timestamptz | |

#### automations
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| name | text | |
| trigger_config | jsonb | Config do trigger |
| condition_config | jsonb | Config da condicao |
| action_config | jsonb | Config da acao |
| is_active | boolean | |
| created_at | timestamptz | |

#### automation_logs
- Registros de execucao de automacoes

#### board_forms
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| slug | text (unique) | URL publica |
| title | text | |
| description | text | |
| fields_config | jsonb | Campos do formulario |
| is_active | boolean | |

#### board_shares
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| token | text (unique) | Token de compartilhamento |
| password_hash | text | Protecao por senha |
| expires_at | timestamptz | |
| is_active | boolean | |

#### board_views
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| name | text | Nome da view salva |
| type | text | table, kanban, timeline, dashboard |
| config | jsonb | Filtros, ordenacao, colunas visiveis |
| is_default | boolean | |

#### board_templates
- Templates de board predefinidos

#### dashboard_widgets
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| board_id | uuid (FK boards) | |
| type | text | Tipo de widget |
| config | jsonb | Configuracao do widget |
| position | jsonb | x, y, w, h |

#### item_dependencies
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | |
| source_item_id | uuid (FK items) | |
| target_item_id | uuid (FK items) | |
| dependency_type | text | blocks, depends_on, related |

#### integrations
- Integracoes externas configuradas

#### notifications
- Notificacoes do sistema para usuarios

## Enum

```sql
CREATE TYPE app_role AS ENUM ('admin', 'member', 'viewer', 'guest');
```

## RPC Functions (Seguranca)

| Funcao | Descricao | Uso |
|--------|-----------|-----|
| `can_access_board(board_id uuid)` | Verifica se usuario pode acessar o board | RLS policies |
| `can_access_item(item_id uuid)` | Verifica se usuario pode acessar o item | RLS policies |
| `has_role(role app_role)` | Verifica se usuario tem o papel especificado | RLS policies |
| `is_workspace_member(workspace_id uuid)` | Verifica se usuario e membro do workspace | RLS policies |
| `search_all(search_term text)` | Busca global em items e boards | Funcionalidade de busca |

## Padroes de Acesso

### Soft Delete
- Boards: campo `state` ('active', 'archived', 'deleted')
- Items: deletados via flag, nao removidos fisicamente
- Funcionalidade de lixeira via `useTrash`

### Cascading
- **Nao ha CASCADE DELETE no banco** para a maioria das relacoes
- Cascading e feito no nivel da aplicacao (em `useCrudMutations.ts`)
- Deletar grupo: remove items do grupo primeiro, depois o grupo
- Deletar coluna: remove column_values da coluna primeiro

### Posicionamento
- Usa `float8` com `Date.now()` como valor de posicao
- Permite insert-between sem renumerar todos os items
- Items, groups, columns, subitems usam esse pattern

### Seguranca
- RLS (Row Level Security) baseada em 4 funcoes RPC
- 3 niveis de controle: workspace membership, board permissions, global role
- Funcoes RPC usadas em RLS policies para simplificar regras
