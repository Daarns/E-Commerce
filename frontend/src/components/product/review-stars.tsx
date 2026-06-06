import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STAR_SIZE_CLASS: Record<NonNullable<ReviewStarsProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function ReviewStars({ rating, size = 'sm', className }: ReviewStarsProps) {
  const roundedRating = Math.round(rating);

  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            STAR_SIZE_CLASS[size],
            star <= roundedRating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-gray-300'
          )}
        />
      ))}
    </div>
  );
}
