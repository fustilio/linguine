import { cn } from '../../utils';
import { card } from '../common-styles';
import { themeVariants } from '../../theme';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card = ({ children, variant = 'default', padding = 'md', className }: CardProps) => {
  return <div className={cn(card({ variant, padding }), className)}>{children}</div>;
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className }: CardHeaderProps) => {
  return <div className={cn('mb-4 border-b pb-4', themeVariants.cardHeader(), className)}>{children}</div>;
};

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={cn(themeVariants.cardContent(), 'space-y-4', className)}>{children}</div>;
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className }: CardFooterProps) => {
  return <div className={cn('mt-4 border-t pt-4', themeVariants.cardHeader(), className)}>{children}</div>;
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className }: CardTitleProps) => {
  return <h3 className={cn(themeVariants.heading(), 'text-lg', className)}>{children}</h3>;
};

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const CardDescription = ({ children, className }: CardDescriptionProps) => {
  return <p className={cn(themeVariants.muted(), 'text-sm', className)}>{children}</p>;
};
