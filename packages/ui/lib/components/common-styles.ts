import { cva } from 'cva';

/**
 * Common CVA button variant with improved dark mode support
 */
export const button = cva({
  base: 'rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-400',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 dark:focus:ring-gray-400',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-400',
      success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-400',
      warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:focus:ring-yellow-400',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400',
      outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed',
      false: '',
    },
  },
  compoundVariants: [
    {
      disabled: true,
      class: 'hover:bg-current focus:ring-0',
    },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
});

/**
 * Common CVA input variant with improved dark mode support
 */
export const input = cva({
  base: 'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  variants: {
    variant: {
      default: 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-400',
      error: 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:ring-red-500 dark:border-red-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-red-400',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

/**
 * Common CVA card variant with improved dark mode support
 */
export const card = cva({
  base: 'rounded-lg border',
  variants: {
    variant: {
      default: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      elevated: 'border-gray-300 bg-white shadow-md dark:border-gray-600 dark:bg-gray-800',
      interactive: 'border-gray-200 bg-white hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg',
    },
    padding: {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

/**
 * Common CVA badge/chip variant with improved dark mode support
 */
export const badge = cva({
  base: 'rounded-full px-2 py-1 text-xs font-medium',
  variants: {
    variant: {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

/**
 * Common CVA select/dropdown variant with improved dark mode support
 */
export const select = cva({
  base: 'rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  variants: {
    variant: {
      default: 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400',
      error: 'border-red-500 bg-white text-gray-900 focus:ring-red-500 dark:border-red-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-red-400',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
