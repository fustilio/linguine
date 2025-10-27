import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ToggleButton, cn } from '@extension/ui';

interface HeaderProps {
  isLight: boolean;
  logo: string;
}

export const Header = ({ isLight, logo }: HeaderProps) => {
  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  return (
    <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
      <button onClick={goGithubSite}>
        <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
      </button>
      <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
    </header>
  );
};
