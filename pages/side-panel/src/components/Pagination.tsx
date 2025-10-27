import { cn } from '@extension/ui';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  isLight: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalItems, pageSize, isLight, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50">
        Previous
      </button>
      <span className={cn(isLight ? 'text-gray-700' : 'text-gray-300')}>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50">
        Next
      </button>
    </div>
  );
};
