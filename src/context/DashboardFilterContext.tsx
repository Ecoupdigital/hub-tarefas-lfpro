import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface DashboardFilter {
  columnId: string;
  value: any;
  label: string;
}

interface DashboardFilterContextType {
  activeFilter: DashboardFilter | null;
  setDashboardFilter: (filter: DashboardFilter) => void;
  clearDashboardFilter: () => void;
}

const DashboardFilterContext = createContext<DashboardFilterContextType | null>(null);

export const useDashboardFilter = () => {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error('useDashboardFilter must be used inside DashboardFilterProvider');
  return ctx;
};

export const DashboardFilterProvider = ({ children }: { children: ReactNode }) => {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter | null>(null);

  const setDashboardFilter = useCallback((filter: DashboardFilter) => {
    setActiveFilter(filter);
  }, []);

  const clearDashboardFilter = useCallback(() => {
    setActiveFilter(null);
  }, []);

  return (
    <DashboardFilterContext.Provider value={{
      activeFilter,
      setDashboardFilter,
      clearDashboardFilter,
    }}>
      {children}
    </DashboardFilterContext.Provider>
  );
};

export default DashboardFilterContext;
