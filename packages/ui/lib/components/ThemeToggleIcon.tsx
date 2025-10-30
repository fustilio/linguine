import { cn } from '@/lib/utils';
import { exampleThemeStorage } from '@extension/storage';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

type ThemeToggleIconProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> & {
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * Theme toggle icon button component
 * Displays sun icon in dark mode, moon icon in light mode
 * Uses chrome.storage as source of truth
 */
export const ThemeToggleIcon = ({ className, size = 'md', ...props }: ThemeToggleIconProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    if (!mounted) return;
    const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'dark';
    const storageTheme = newTheme === 'dark' ? 'dark' : newTheme === 'light' ? 'light' : 'system';
    exampleThemeStorage
      .setTheme(storageTheme)
      .then(() => {
        setTheme(newTheme);
      })
      .catch(() => {
        setTheme(newTheme);
      });
  };

  return (
    <button
      onClick={handleClick}
      disabled={!mounted}
      aria-label="Toggle theme"
      className={cn(
        'flex items-center justify-center rounded-lg border transition-all',
        'border-gray-300 bg-white text-gray-700 hover:scale-110 active:scale-95',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
        !mounted && 'opacity-50',
        sizeClasses[size],
        className,
      )}
      title={mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      {...props}>
      {mounted && theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconSizeClasses[size]}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconSizeClasses[size]}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
};
