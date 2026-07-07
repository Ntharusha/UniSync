import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 30 seconds, then refetch in background
      staleTime: 30 * 1000,
      // Cache data for 5 minutes even when unused
      gcTime: 5 * 60 * 1000,
      // Retry failed requests twice before showing an error
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      // Refetch when app comes back to foreground
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
