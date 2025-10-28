import { cn } from '@/lib/utils';
import { RingLoader } from 'react-spinners';

interface ILoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner = ({ size, className }: ILoadingSpinnerProps) => (
  <div className={cn('flex min-h-screen items-center justify-center', className)}>
    <RingLoader size={size ?? 100} color={'aqua'} />
  </div>
);
