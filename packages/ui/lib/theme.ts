import { cva } from 'cva';
import { cn } from './utils';

/**
 * Theme-aware utility functions using CVA for consistent styling across components
 */

/**
 * CVA variants for theme-aware components
 */
export const themeVariants = {
  // Layout components
  container: cva({
    base: 'min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100',
  }),

  sidebar: cva({
    base: 'flex w-64 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
  }),

  main: cva({
    base: 'flex flex-1 flex-col bg-white dark:bg-gray-900',
  }),

  // Card components
  card: cva({
    base: 'rounded-lg border bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
  }),

  cardHeader: cva({
    base: 'border-b p-4 border-gray-200 dark:border-gray-700',
  }),

  cardContent: cva({
    base: 'p-4 text-gray-900 dark:text-gray-100',
  }),

  // Button components
  button: cva({
    base: 'rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    variants: {
      variant: {
        primary:
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-400',
        secondary:
          'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 dark:focus:ring-gray-400',
        danger:
          'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-400',
        success:
          'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-400',
        warning:
          'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:focus:ring-yellow-400',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400',
        outline:
          'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400',
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
  }),

  // Input components
  input: cva({
    base: 'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    variants: {
      variant: {
        default:
          'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-400',
        error:
          'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:ring-red-500 dark:border-red-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-red-400',
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
  }),

  select: cva({
    base: 'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    variants: {
      variant: {
        default:
          'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400',
        error:
          'border-red-500 bg-white text-gray-900 focus:ring-red-500 dark:border-red-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),

  // Text components
  heading: cva({
    base: 'font-bold text-gray-900 dark:text-gray-100',
  }),

  subheading: cva({
    base: 'font-semibold text-gray-900 dark:text-gray-100',
  }),

  body: cva({
    base: 'text-gray-900 dark:text-gray-100',
  }),

  muted: cva({
    base: 'text-gray-500 dark:text-gray-400',
  }),

  // Table components
  table: cva({
    base: 'min-w-full divide-y border-gray-200 dark:border-gray-700',
  }),

  tableHeader: cva({
    base: 'bg-gray-50 dark:bg-gray-800',
  }),

  tableRow: cva({
    base: 'bg-white dark:bg-gray-900 divide-y border-gray-200 dark:border-gray-700',
  }),

  tableCell: cva({
    base: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
  }),

  // Modal components
  modalOverlay: cva({
    base: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
  }),

  modalContent: cva({
    base: 'rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
  }),

  modalHeader: cva({
    base: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
  }),

  modalBody: cva({
    base: 'px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]',
  }),

  modalFooter: cva({
    base: 'px-6 py-4 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  }),

  // Badge components
  badge: cva({
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
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
  }),

  // Status indicators
  statusSuccess: cva({
    base: 'text-green-600 dark:text-green-400',
  }),
  statusWarning: cva({
    base: 'text-yellow-600 dark:text-yellow-400',
  }),
  statusError: cva({
    base: 'text-red-600 dark:text-red-400',
  }),
  statusInfo: cva({
    base: 'text-blue-600 dark:text-blue-400',
  }),
};

// Theme-aware class name generator removed - use Tailwind dark: prefix directly

/**
 * Readability score styling
 */
export const getReadabilityStyles = (score: number) => {
  if (score >= 90) {
    return {
      text: 'Very Easy',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
  }
  if (score >= 60) {
    return {
      text: 'Easy',
      color: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    };
  }
  if (score >= 30) {
    return {
      text: 'Moderate',
      color: 'text-yellow-500 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
  }
  return {
    text: 'Difficult',
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
};

/**
 * Language display names
 */
export const getLanguageDisplayName = (lang: string): string => {
  const languageNames: Record<string, string> = {
    'en-US': 'English',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
  };
  return languageNames[lang] || lang;
};
