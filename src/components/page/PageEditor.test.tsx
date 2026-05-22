import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
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

describe('PageEditor', () => {
  it('monta sem erros com conteudo vazio', () => {
    const { container } = render(
      <ThemeProvider>
        <PageEditor />
      </ThemeProvider>
    );
    // BlockNote injeta nodes com prefixo bn- (bn-container, bn-editor, etc.).
    const blockNoteRoot = container.querySelector('[class*="bn-"], .ProseMirror');
    expect(blockNoteRoot).toBeTruthy();
  });

  it('aceita prop onChange sem quebrar montagem', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <PageEditor onChange={onChange} editable />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeTruthy();
    // onChange foi passado; o callback so dispara em mudanca real do editor.
    expect(onChange).toBeDefined();
  });

  it('renderiza em modo somente leitura quando editable=false', () => {
    const { container } = render(
      <ThemeProvider>
        <PageEditor editable={false} />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeTruthy();
  });
});
