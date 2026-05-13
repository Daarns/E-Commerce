import { useEffect, useRef, useCallback } from 'react';

interface UseScrollCarouselProps {
  onScrollEnd?: () => void;
  scrollThreshold?: number;
  resetDelay?: number;
}

export function useScrollCarousel({
  onScrollEnd,
  scrollThreshold = 20,
  resetDelay = 500,
}: UseScrollCarouselProps = {}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

    if (scrollLeft >= scrollWidth - clientWidth - scrollThreshold) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = 0;
        }
      }, resetDelay);
      onScrollEnd?.();
    }
  }, [onScrollEnd, scrollThreshold, resetDelay]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  const scroll = useCallback((direction: 'left' | 'right'): void => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, []);

  return { scrollContainerRef, scroll };
}
