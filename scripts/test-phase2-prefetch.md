# Script de Teste — Fase 2: Prefetch de "Meu Trabalho"

## Testes manuais no navegador (DevTools → Network)

### TESTE 1: Prefetch no login
1. Abra o DevTools → aba **Network** → filtrar por "get_my_work_items"
2. Faça logout
3. Faça login novamente
4. **Esperado**: Uma requisição para `get_my_work_items` aparece automaticamente
   nos primeiros 2 segundos após o login, mesmo sem navegar para "Meu Trabalho"

### TESTE 2: Prefetch no hover
1. Abra o DevTools → aba **Network** → filtrar por "get_my_work_items"
2. Navegue para qualquer board (não "Meu Trabalho")
3. Passe o mouse sobre "Meu trabalho" na sidebar **sem clicar**
4. **Esperado**: Requisição para `get_my_work_items` inicia no hover
5. Clique em "Meu trabalho"
6. **Esperado**: A página carrega instantaneamente (sem loading spinner),
   porque o prefetch já completou

### TESTE 3: staleTime de 5 minutos
1. Clique em "Meu trabalho" — deixe carregar
2. Navegue para outro board
3. Volte para "Meu trabalho" dentro de 5 minutos
4. **Esperado**: Carrega instantaneamente (sem requisição de rede),
   usando dados do cache
5. Abra o DevTools → Application → Storage → React Query DevTools
   (se instalado) para verificar que a query está "fresh"

### TESTE 4: Realtime invalida cache
1. Carregue "Meu trabalho"
2. Em outro computador/aba, mude o status de um item que você está atribuído
3. **Esperado**: A página de "Meu trabalho" atualiza automaticamente
   em alguns segundos via Realtime (mesmo sem o staleTime expirar)

### TESTE 5: Comparação de performance
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Meça o tempo de carregamento do "Meu Trabalho" (veja o spinner)
3. **Esperado**: Carregamento < 1 segundo (antes era 3-5 segundos)

## Verificação no código

```bash
# Verificar que prefetchMyWorkItems está sendo importado e usado
grep -n "prefetchMyWorkItems" src/hooks/useAuth.tsx src/components/AppSidebar.tsx

# Verificar staleTime no hook
grep -n "STALE_TIME\|staleTime" src/hooks/useMyWorkItems.ts

# Verificar que o hook usa a RPC (não mais as queries antigas)
grep -n "rpc\|batchIn\|column_values.*people" src/hooks/useMyWorkItems.ts
```

## Resultado esperado dos comandos
- `useAuth.tsx`: deve ter `prefetchMyWorkItems(queryClient, session.user.id)` em 2 lugares
- `AppSidebar.tsx`: deve ter `onMouseEnter={() => prefetchMyWorkItems(...)}`
- `useMyWorkItems.ts`: deve ter `supabase.rpc('get_my_work_items', ...)` e NÃO ter `batchIn`
- `STALE_TIME = 5 * 60 * 1000` (300000ms)
