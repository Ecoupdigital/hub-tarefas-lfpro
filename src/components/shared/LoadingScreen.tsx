import React from 'react';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

export default LoadingScreen;
