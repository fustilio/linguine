import { cn } from '../../utils';
import { themeVariants } from '../../theme';
import { button } from '../common-styles';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Modal = ({ isOpen, onClose, children, size = 'lg', className }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className={themeVariants.modalOverlay()} onClick={onClose}>
      <div
        className={cn(themeVariants.modalContent(), sizeClasses[size], className)}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalHeader = ({ children, onClose, className }: ModalHeaderProps) => {
  return (
    <div className={cn(themeVariants.modalHeader(), className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:text-gray-300">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export const ModalBody = ({ children, className }: ModalBodyProps) => {
  return <div className={cn(themeVariants.modalBody(), className)}>{children}</div>;
};

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooter = ({ children, className }: ModalFooterProps) => {
  return <div className={cn(themeVariants.modalFooter(), className)}>{children}</div>;
};

interface ModalActionsProps {
  children: ReactNode;
  className?: string;
}

export const ModalActions = ({ children, className }: ModalActionsProps) => {
  return <div className={cn('flex justify-end gap-2', className)}>{children}</div>;
};
