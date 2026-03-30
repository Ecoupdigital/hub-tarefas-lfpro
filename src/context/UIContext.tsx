import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { BoardView } from '@/context/AppContext';

interface UIContextType {
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  selectedItem: any | null;
  /** Abre um item novo limpando o histórico de navegação */
  setSelectedItem: (item: any | null) => void;
  /** Atualiza o item selecionado no lugar (sem limpar o navStack) */
  updateSelectedItem: (item: any) => void;
  /** Abre um item com um navStack pré-definido (ex: abrir subitem da tabela com pai no breadcrumb) */
  setSelectedItemWithStack: (item: any, stack: any[]) => void;
  /** Navega para um subitem empilhando o item atual no histórico */
  pushNavItem: (item: any) => void;
  /** Volta um nível no histórico de navegação */
  popNavItem: () => void;
  /** Salta diretamente para um nível específico do histórico */
  jumpToNavLevel: (idx: number) => void;
  /** Histórico de navegação (do mais antigo ao mais recente) */
  navStack: any[];
  activeView: BoardView;
  setActiveView: (v: BoardView) => void;
  zenMode: boolean;
  setZenMode: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
};

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItemState, setSelectedItemState] = useState<any | null>(null);
  const [navStack, setNavStack] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<BoardView>('table');
  const [zenMode, setZenMode] = useState(false);

  // Abre item novo — limpa o histórico (chamado do board)
  const setSelectedItem = useCallback((item: any | null) => {
    setNavStack([]);
    setSelectedItemState(item);
  }, []);

  // Atualiza item no lugar — sem limpar navStack (usado para updates otimistas no painel)
  const updateSelectedItem = useCallback((item: any) => {
    setSelectedItemState(item);
  }, []);

  // Abre item com navStack pré-definido — atômico, sem batching issues (usado para abrir subitem da tabela)
  const setSelectedItemWithStack = useCallback((item: any, stack: any[]) => {
    setNavStack(stack);
    setSelectedItemState(item);
  }, []);

  // Navega para um subitem — empilha o item atual no histórico
  const pushNavItem = useCallback((item: any) => {
    setSelectedItemState(prev => {
      if (prev) setNavStack(stack => [...stack, prev]);
      return item;
    });
  }, []);

  // Volta um nível no histórico
  const popNavItem = useCallback(() => {
    setNavStack(prev => {
      const newStack = [...prev];
      const prevItem = newStack.pop() ?? null;
      setSelectedItemState(prevItem);
      return newStack;
    });
  }, []);

  // Salta diretamente para um nível específico (idx = posição em navStack)
  const jumpToNavLevel = useCallback((idx: number) => {
    setNavStack(prev => {
      const target = prev[idx] ?? null;
      setSelectedItemState(target);
      return prev.slice(0, idx);
    });
  }, []);

  return (
    <UIContext.Provider value={{
      activeBoardId, setActiveBoardId,
      activeWorkspaceId, setActiveWorkspaceId,
      sidebarCollapsed, setSidebarCollapsed,
      selectedItem: selectedItemState,
      setSelectedItem,
      updateSelectedItem,
      setSelectedItemWithStack,
      pushNavItem,
      popNavItem,
      jumpToNavLevel,
      navStack,
      activeView, setActiveView,
      zenMode, setZenMode,
    }}>
      {children}
    </UIContext.Provider>
  );
};

export default UIContext;
