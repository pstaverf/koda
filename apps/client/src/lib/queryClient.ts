import { QueryClient } from "@tanstack/react-query";
import { ApiError, onSignOut } from "../api/http.js";

const maxRetries = 2;

const shouldRetry = (failureCount: number, error: Error): boolean => {
  if (error instanceof ApiError && error.status > 0 && error.status < 500) {
    return false;
  }
  return failureCount < maxRetries;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: shouldRetry,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
});

onSignOut(() => {
  queryClient.clear();
});
