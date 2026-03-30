import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/shared/LoadingScreen";

// Lazy-loaded route-level components
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PublicForm = React.lazy(() => import("./pages/PublicForm"));
const SharedBoard = React.lazy(() => import("./pages/SharedBoard"));
const Settings = React.lazy(() => import("./pages/Settings"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedApp = () => (
  <AppProvider>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/board/:boardId" element={<Index />} />
      <Route path="/workspace/:workspaceId" element={<Index />} />
      <Route path="/my-work" element={<Index />} />
      <Route path="/team-work" element={<Index />} />
      <Route path="/settings/*" element={<Settings />} />
    </Routes>
  </AppProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/form/:slug" element={<PublicForm />} />
            <Route path="/shared/:token" element={<SharedBoard />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <ProtectedApp />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
