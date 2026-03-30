# EcoUP Hub - Avaliacao de Divida Tecnica

> Documento gerado para contexto de agentes AIOS. Ultima atualizacao: 2026-02-17

## Resumo

O projeto esta funcional e bem estruturado para um MVP, mas possui areas que precisam de atencao para escalar. A arquitetura segue bons patterns (React Query, Supabase Realtime, componentes compostos), porem alguns acoplamentos e decisoes de simplicidade inicial precisam ser revisados.

## Dividas Identificadas

### CRITICA - Impacto Alto

#### 1. Filtragem e Ordenacao Exclusivamente Client-Side
- **Onde**: `AppContext.tsx` (useMemo que computa activeBoard)
- **Problema**: Todos os items sao carregados do banco e filtrados/ordenados no navegador. Para boards com 1000+ items, isso causa lentidao.
- **Solucao**: Implementar filtragem server-side via Supabase PostgREST filters, com paginacao.
- **Impacto**: Performance degradada em boards grandes.

#### 2. Ausencia de CASCADE DELETE no Banco
- **Onde**: Schema PostgreSQL + `useCrudMutations.ts`
- **Problema**: Cascading e feito na aplicacao (deletar grupo remove items primeiro, etc.). Se a aplicacao falhar no meio, dados orfaos ficam no banco.
- **Solucao**: Adicionar ON DELETE CASCADE nas foreign keys ou implementar triggers no banco.
- **Impacto**: Integridade de dados em risco.

#### 3. AppContext como God Object
- **Onde**: `src/context/AppContext.tsx` (~316 linhas)
- **Problema**: Centraliza estado de UI, dados de todos os hooks, filtros, ordenacao, onboarding, e computa activeBoard. Qualquer mudanca causa re-render em toda a arvore.
- **Solucao**: Dividir em contextos menores (BoardContext, FilterContext, UIContext).
- **Impacto**: Performance de re-renders e manutenibilidade.

### ALTA - Impacto Medio

#### 4. Dual Filter System
- **Onde**: `AppContext.tsx` (filters simples + advancedFilter)
- **Problema**: Dois sistemas de filtro coexistem (legado simples e avancado FilterGroup). Codigo duplicado e confusao sobre qual usar.
- **Solucao**: Migrar para apenas o sistema avancado, removendo o legado.

#### 5. Onboarding Embutido no Contexto
- **Onde**: `AppContext.tsx` (useEffect de onboarding)
- **Problema**: Logica de onboarding (criar workspace + board + colunas default para novos usuarios) esta acoplada ao contexto global.
- **Solucao**: Extrair para hook dedicado `useOnboarding` ou componente separado.

#### 6. Tipos any em Interfaces
- **Onde**: `ColumnValue.value: any`, arrays no AppContext expostos como `any`
- **Problema**: Perde a seguranca de tipos do TypeScript. Bugs de tipo nao sao detectados em compilacao.
- **Solucao**: Criar union types para cada tipo de coluna (StatusValue, DateValue, etc.).

#### 7. Mistura de Queries e Mutations no Mesmo Hook
- **Onde**: `useCrudMutations.ts` contem `useFavorites` (query de leitura)
- **Problema**: Inconsistencia com a separacao definida (leitura em useSupabaseData, escrita em useCrudMutations).
- **Solucao**: Mover `useFavorites` para `useSupabaseData.ts`.

#### 8. Realtime Apenas para Board Ativo
- **Onde**: `useRealtimeSync.ts` integrado no AppContext
- **Problema**: Subscricoes Realtime so existem para o board ativo. Se outro usuario modifica um board diferente, o cache fica stale ate navegar para ele.
- **Solucao**: Manter subscricoes Realtime para todos os boards do workspace, ou invalidar cache ao navegar.

### MEDIA - Impacto Baixo

#### 9. Hardcoded Mock Data
- **Onde**: `src/data/mockData.ts`
- **Problema**: Dados mock de usuarios e colunas usados em desenvolvimento podem vazar para producao.
- **Solucao**: Mover para `__mocks__/` ou condicionar ao ambiente.

#### 10. Ausencia de Error Boundaries
- **Onde**: `App.tsx`
- **Problema**: Nao ha React Error Boundaries. Um erro em qualquer componente crasha a aplicacao inteira.
- **Solucao**: Adicionar Error Boundaries em pontos estrategicos (layout, board view, sidebar).

#### 11. Componentes de Board Muito Grandes
- **Onde**: `BoardTable.tsx` (~750 linhas), `BoardKanban.tsx` (~900 linhas)
- **Problema**: Arquivos grandes dificultam manutencao e code review.
- **Solucao**: Extrair sub-componentes (TableRow, TableHeader, KanbanCard, etc.).

#### 12. RLS Policy Pendente para Workspace Deletion
- **Onde**: `useCrudMutations.ts` (comentario inline no delete workspace)
- **Problema**: Ha um TODO/comentario indicando que a politica RLS para deletar workspace precisa ser verificada.
- **Solucao**: Auditar e implementar a RLS policy correta.

#### 13. Densidade Parcialmente Aplicada
- **Onde**: Diversos componentes de celula (*Cell.tsx)
- **Problema**: O sistema de densidade foi aplicado a BoardTable, BoardKanban e AppSidebar, mas as 16 celulas especializadas e outros componentes (modais, paineis) ainda usam tamanhos hardcoded.
- **Solucao**: Migrar todos os componentes para usar as classes de densidade CSS.

## Prioridades Sugeridas

| Prioridade | Item | Esforco |
|-----------|------|---------|
| 1 | Filtragem server-side (#1) | Alto |
| 2 | Dividir AppContext (#3) | Medio |
| 3 | CASCADE DELETE no banco (#2) | Medio |
| 4 | Unificar filtros (#4) | Baixo |
| 5 | Tipos fortes para ColumnValue (#6) | Medio |
| 6 | Error Boundaries (#10) | Baixo |
| 7 | Completar sistema de densidade (#13) | Baixo |
| 8 | Extrair onboarding (#5) | Baixo |

## Pontos Fortes

- **React Query bem utilizado**: Cache keys estruturadas, invalidacao precisa, optimistic updates
- **Separacao de concerns nos hooks**: Leitura (useSupabaseData) vs Escrita (useCrudMutations) vs Realtime (useRealtimeSync)
- **Supabase como BaaS**: Auth, DB, Realtime em um unico servico, simplifica operacoes
- **shadcn-ui**: Componentes acessiveis e customizaveis, nao acoplam a lib
- **Sistema de densidade funcional**: 3 niveis com CSS Custom Properties, facil de estender
- **Lazy loading de rotas**: Code splitting com React.lazy
- **Tipo de coluna extensivel**: Pattern EAV permite adicionar novos tipos facilmente
