import { cn } from '../../utils';
import { badge } from '../common-styles';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge = ({ children, variant = 'default', size = 'md', className }: BadgeProps) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn(badge({ variant }), sizeClasses[size], className)}>
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: ReactNode;
  className?: string;
}

export const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  const statusVariants = {
    success: 'primary',
    warning: 'warning',
    error: 'danger',
    info: 'default',
    pending: 'default',
  } as const;

  return (
    <Badge variant={statusVariants[status]} className={className}>
      {children}
    </Badge>
  );
};

interface ReadabilityBadgeProps {
  score: number;
  className?: string;
}

export const ReadabilityBadge = ({ score, className }: ReadabilityBadgeProps) => {
  const getReadabilityInfo = (score: number) => {
    if (score >= 90) return { text: 'Very Easy', variant: 'success' as const };
    if (score >= 60) return { text: 'Easy', variant: 'success' as const };
    if (score >= 30) return { text: 'Moderate', variant: 'warning' as const };
    return { text: 'Difficult', variant: 'danger' as const };
  };

  const { text, variant } = getReadabilityInfo(score);

  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
};
