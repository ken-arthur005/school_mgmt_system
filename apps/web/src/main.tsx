import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/lib/auth/supabase';
import { createQueryClient } from '@/lib/query';
import { SearchProvider } from '@/lib/search-text';
import { createAppRouter } from './router';
import './index.css';

const queryClient = createQueryClient();
const router = createAppRouter(queryClient);

// Signed out (by the button, an expired login or another tab): forget everything loaded, then
// show the sign-in screen.
supabase.auth.onAuthStateChange((event) => {
  if (event !== 'SIGNED_OUT') return;
  queryClient.clear();
  void router.navigate({ to: '/sign-in', replace: true });
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element in index.html');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        <RouterProvider router={router} />
      </SearchProvider>
    </QueryClientProvider>
  </StrictMode>,
);
