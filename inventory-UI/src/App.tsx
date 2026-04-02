import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: 'var(--color-success)', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
