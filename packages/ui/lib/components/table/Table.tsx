import { cn } from '../../utils';
import { themeVariants } from '../../theme';
import type { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export const Table = ({ children, className }: TableProps) => {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={themeVariants.table()}>{children}</table>
    </div>
  );
};

interface TableHeaderProps {
  children: ReactNode;
}

export const TableHeader = ({ children }: TableHeaderProps) => {
  return <thead className={themeVariants.tableHeader()}>{children}</thead>;
};

interface TableBodyProps {
  children: ReactNode;
}

export const TableBody = ({ children }: TableBodyProps) => {
  return <tbody className={themeVariants.tableRow()}>{children}</tbody>;
};

interface TableRowProps {
  children: ReactNode;
  isSelected?: boolean;
  className?: string;
}

export const TableRow = ({ children, isSelected, className }: TableRowProps) => {
  return <tr className={cn(isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : '', className)}>{children}</tr>;
};

interface TableCellProps {
  children: ReactNode;
  className?: string;
  header?: boolean;
}

export const TableCell = ({ children, className, header = false }: TableCellProps) => {
  const Component = header ? 'th' : 'td';

  return (
    <Component
      className={cn(
        themeVariants.tableCell(),
        header && 'text-left text-xs font-medium uppercase tracking-wider',
        className,
      )}>
      {children}
    </Component>
  );
};

interface TableHeaderCellProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHeaderCell = ({ children, className, sortable, sortDirection, onSort }: TableHeaderCellProps) => {
  return (
    <th
      className={cn(
        themeVariants.tableCell(),
        'text-left text-xs font-medium uppercase tracking-wider',
        sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
        className,
      )}
      onClick={sortable ? onSort : undefined}>
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <div className="flex flex-col">
            <span
              className={cn('text-xs', sortDirection === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')}>
              ▲
            </span>
            <span
              className={cn(
                '-mt-1 text-xs',
                sortDirection === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400',
              )}>
              ▼
            </span>
          </div>
        )}
      </div>
    </th>
  );
};
