import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { Board } from '@/types/board';

/**
 * Smoke integration test (Fase 03 — REQ-23..26).
 *
 * Garante que as 4 NotionView renderizam sem crash com BoardContext mockado.
 * Nao testa drag-drop (dnd-kit precisa setup pesado, fora do escopo do smoke).
 */

// Mocks dos hooks de dados — todos retornam estado minimo
vi.mock('@/hooks/useSupabaseData', () => ({
  useProfiles: () => ({ data: [{ id: 'u1', name: 'Alice', email: 'a@a.com', avatar_url: null }] }),
  useUpdateColumnValue: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCreateItem: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateItem: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBoardViews', () => ({
  useBoardViews: () => ({ data: [], isLoading: false }),
  useUpdateBoardViewConfig: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

const fakeBoard: Board = {
  id: 'b1',
  workspaceId: 'w1',
  name: 'DB Test',
  position: 0,
  page_id: 'p1',
  groups: [
    {
      id: 'g1',
      boardId: 'b1',
      title: 'Grupo 1',
      color: 'gray',
      isCollapsed: false,
      position: 0,
      items: [
        {
          id: 'i1',
          boardId: 'b1',
          groupId: 'g1',
          name: 'Item Alpha',
          position: 0,
          columnValues: {
            'c-status': { value: 'todo' } as never,
            'c-date': { value: '2026-05-22' } as never,
            'c-people': { value: ['u1'] } as never,
          },
        },
      ],
    },
  ],
  columns: [
    {
      id: 'c-status',
      boardId: 'b1',
      title: 'Status',
      type: 'status',
      width: 120,
      position: 0,
      settings: {
        labels: {
          todo: { name: 'A fazer', color: 'blue' },
          done: { name: 'Feito', color: 'green' },
        },
      },
    },
    { id: 'c-date', boardId: 'b1', title: 'Data', type: 'date', width: 120, position: 1, settings: {} },
    { id: 'c-people', boardId: 'b1', title: 'Pessoas', type: 'people', width: 120, position: 2, settings: {} },
  ],
};

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeBoard: fakeBoard,
    setSelectedItem: vi.fn(),
  }),
}));

function renderWithProviders(node: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

describe('Notion views — smoke integration (Fase 03)', () => {
  beforeEach(() => cleanup());

  it('NotionTableView renderiza item Alpha sem crash', async () => {
    const NotionTableView = (await import('@/components/database/notion/NotionTableView')).default;
    renderWithProviders(<NotionTableView mode="database" />);
    expect(screen.getByText('Item Alpha')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument(); // header
  });

  it('NotionKanbanView agrupa por status e mostra coluna A fazer com 1 card', async () => {
    const NotionKanbanView = (await import('@/components/database/notion/NotionKanbanView')).default;
    renderWithProviders(<NotionKanbanView mode="database" />);
    // "A fazer" pode aparecer 2x (header da coluna + card label) — basta existir
    expect(screen.getAllByText('A fazer').length).toBeGreaterThan(0);
    expect(screen.getByText('Item Alpha')).toBeInTheDocument();
    // Contador (1) presente em pelo menos uma coluna
    expect(screen.getAllByText('(1)').length).toBeGreaterThan(0);
  });

  it('NotionCalendarView renderiza header com mes/ano e dia 22 do mes', async () => {
    const NotionCalendarView = (await import('@/components/database/notion/NotionCalendarView')).default;
    renderWithProviders(<NotionCalendarView mode="database" />);
    // Header tem botoes Hoje, Anterior, Proximo
    expect(screen.getByRole('button', { name: /Hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
    // Dia 22 aparece como texto em alguma celula
    expect(screen.getAllByText(/22/).length).toBeGreaterThan(0);
  });

  it('NotionListView renderiza contador "1 item" e o item Alpha', async () => {
    const NotionListView = (await import('@/components/database/notion/NotionListView')).default;
    renderWithProviders(<NotionListView mode="database" />);
    expect(screen.getByText('Item Alpha')).toBeInTheDocument();
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
  });
});
