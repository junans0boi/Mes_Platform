import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { createAppRouter } from './router/createAppRouter';
import { defaultBootstrapLoader } from './shell/bootstrap';

export function App() {
  const [router] = useState(() => createAppRouter(defaultBootstrapLoader));
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
