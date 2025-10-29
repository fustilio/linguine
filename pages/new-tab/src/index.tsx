import '@src/index.css';
import { ThemeProvider } from '@extension/ui';
import NewTab from '@src/NewTab';
import { createRoot } from 'react-dom/client';

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <ThemeProvider>
      <NewTab />
    </ThemeProvider>
  );
};

init();
