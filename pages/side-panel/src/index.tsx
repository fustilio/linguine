import '@src/index.css';
import { QueryClient, QueryClientProvider } from '@extension/api';
import { ThemeProvider } from '@extension/ui';
import SidePanel from '@src/SidePanel';
import { createRoot } from 'react-dom/client';

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }

  const queryClient = new QueryClient();

  const root = createRoot(appContainer);
  root.render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SidePanel />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

init();
