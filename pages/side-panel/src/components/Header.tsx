import { PROJECT_URL_OBJECT } from '@extension/shared';
import { ThemeToggleIcon, cn } from '@extension/ui';

interface HeaderProps {
  logo: string;
}

export const Header = ({ logo }: HeaderProps) => {
  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  return (
    <header className={cn('flex items-center justify-between py-2')}>
      {/* Logo and Brand Section */}
      <div className="flex items-center space-x-3">
        <button
          onClick={goGithubSite}
          className="group relative overflow-hidden rounded-lg p-1 transition-all duration-200 hover:scale-105 hover:shadow-md">
          <img
            src={chrome.runtime.getURL(logo)}
            className="h-8 w-8 transition-transform duration-200 group-hover:rotate-6"
            alt="Linguine Logo"
          />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Linguine</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Language Learning Assistant</p>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex items-center space-x-2">
        <ThemeToggleIcon size="md" />
      </div>
    </header>
  );
};
