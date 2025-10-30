import { cn } from '../../utils';
import { themeVariants } from '../../theme';
import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard = ({ title, value, subtitle, className, icon, trend }: StatsCardProps) => {
  return (
    <div
      className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400')}>
            {title}
          </p>
          <p className={cn('text-2xl font-bold text-gray-900 dark:text-gray-100')}>{value}</p>
          {subtitle && <p className={cn('text-sm text-gray-500 dark:text-gray-400')}>{subtitle}</p>}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {trend && (
        <div className="mt-2 flex items-center">
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span className={cn('ml-1 text-xs text-gray-500 dark:text-gray-400')}>vs last period</span>
        </div>
      )}
    </div>
  );
};

interface StatsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const StatsGrid = ({ children, columns = 4, className }: StatsGridProps) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-6',
  };

  return <div className={cn('grid gap-4', gridClasses[columns], className)}>{children}</div>;
};
