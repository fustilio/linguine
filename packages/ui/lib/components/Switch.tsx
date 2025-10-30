import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type SwitchProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
  lg: 'h-7 w-14',
};

const thumbSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const translateClasses = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-7',
};

/**
 * Switch component - toggle between on/off states
 */
export const Switch = ({ checked, onCheckedChange, size = 'md', className, ...props }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      checked ? 'bg-[#4caf50] focus:ring-[#4caf50]' : 'bg-gray-300 focus:ring-gray-400 dark:bg-gray-600',
      sizeClasses[size],
      className,
    )}
    {...props}>
    <span
      className={cn(
        'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
        checked ? translateClasses[size] : 'translate-x-0',
        thumbSizeClasses[size],
      )}
    />
  </button>
);
