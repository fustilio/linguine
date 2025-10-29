import { cn } from '@/lib/utils';
import { exampleThemeStorage } from '@extension/storage';
import { useTheme } from 'next-themes';
import type { ComponentPropsWithoutRef } from 'react';
import { useEffect, useState } from 'react';

type ToggleButtonProps = ComponentPropsWithoutRef<'button'>;

export const ToggleButton = ({ className, children, onClick, ...props }: ToggleButtonProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Call any onClick handler passed as prop first
    if (onClick) {
      onClick(e);
      return;
    }
    
    // Determine new theme
    const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'dark';
    const storageTheme = newTheme === 'dark' ? 'dark' : newTheme === 'light' ? 'light' : 'system';
    
    // Write to chrome.storage first (source of truth)
    exampleThemeStorage.setTheme(storageTheme).then(() => {
      // After chrome.storage is updated, update next-themes (which writes to localStorage)
      setTheme(newTheme);
    }).catch(() => {
      // Fallback: update next-themes even if chrome.storage fails
      setTheme(newTheme);
    });
  };

  if (!mounted) {
    // Prevent hydration mismatch by not rendering theme-dependent classes
    return (
      <button
        className={cn('mt-4 rounded border-2 px-4 py-1 font-bold shadow hover:scale-105', className)}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn(
        'mt-4 rounded border-2 px-4 py-1 font-bold shadow hover:scale-105',
        className,
      )}
      onClick={handleClick}
      {...props}>
      {children}
    </button>
  );
};
