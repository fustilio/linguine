import { cn } from '../../utils';
import { input, select } from '../common-styles';
import type { ComponentPropsWithoutRef } from 'react';

interface FormFieldProps extends ComponentPropsWithoutRef<'div'> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const FormField = ({ label, error, required, children, className, ...props }: FormFieldProps) => {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {label && (
        <label className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300')}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className={cn('text-sm text-red-600 dark:text-red-400')}>{error}</p>}
    </div>
  );
};

interface TextInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  variant?: 'default' | 'error';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const TextInput = ({ variant = 'default', inputSize = 'md', className, ...props }: TextInputProps) => {
  return <input className={cn(input({ variant, size: inputSize }), className)} {...props} />;
};

interface TextAreaProps extends ComponentPropsWithoutRef<'textarea'> {
  variant?: 'default' | 'error';
  textareaSize?: 'sm' | 'md' | 'lg';
}

export const TextArea = ({ variant = 'default', textareaSize = 'md', className, ...props }: TextAreaProps) => {
  return <textarea className={cn(input({ variant, size: textareaSize }), className)} {...props} />;
};

interface SelectProps extends Omit<ComponentPropsWithoutRef<'select'>, 'size'> {
  variant?: 'default' | 'error';
  selectSize?: 'sm' | 'md' | 'lg';
}

export const Select = ({ variant = 'default', selectSize = 'md', className, ...props }: SelectProps) => {
  return <select className={cn(select({ variant }), className)} {...props} />;
};
