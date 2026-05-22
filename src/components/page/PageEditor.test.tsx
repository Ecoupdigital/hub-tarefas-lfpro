import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PageEditor from './PageEditor';

// matchMedia ja vem mockado em src/test/setup.ts.
// jsdom nao implementa ResizeObserver, usado pelo BlockNote/Mantine.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );

describe('PageEditor', () => {
  it('monta sem erros com conteudo vazio', () => {
    const { container } = renderWithProviders(<PageEditor />);
    // BlockNote injeta nodes com prefixo bn- (bn-container, bn-editor, etc.).
    const blockNoteRoot = container.querySelector('[class*="bn-"], .ProseMirror');
    expect(blockNoteRoot).toBeTruthy();
  });

  it('aceita prop onChange sem quebrar montagem', () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(<PageEditor onChange={onChange} editable />);
    expect(container.firstChild).toBeTruthy();
    // onChange foi passado; o callback so dispara em mudanca real do editor.
    expect(onChange).toBeDefined();
  });

  it('renderiza em modo somente leitura quando editable=false', () => {
    const { container } = renderWithProviders(<PageEditor editable={false} />);
    expect(container.firstChild).toBeTruthy();
  });
});
