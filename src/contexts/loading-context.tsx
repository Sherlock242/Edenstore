
"use client";

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { GlobalLoader } from '@/components/global-loader';

type LoadingContextType = {
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);

  const startLoading = () => setLoading(true);
  const stopLoading = () => setLoading(false);

  const value = { startLoading, stopLoading };

  return (
    <LoadingContext.Provider value={value}>
      <GlobalLoader isLoading={loading} />
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
