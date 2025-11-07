/**
 * React Query Provider
 * 
 * Wraps the application with QueryClientProvider for data caching,
 * automatic refetching, and optimistic updates.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure React Query with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetching by default (manual control for better UX)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export queryClient for direct access when needed
export { queryClient };
