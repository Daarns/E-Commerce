'use client';

import { Button } from '@/components/ui/button';

interface OrderPaginationProps {
  currentPage: number;
  itemsCount: number;
  itemsPerPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function OrderPagination({
  currentPage,
  itemsCount,
  itemsPerPage,
  onPreviousPage,
  onNextPage,
}: OrderPaginationProps) {
  const startIndex = itemsCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, 999);
  const canGoNext = itemsCount === itemsPerPage;
  const canGoPrevious = currentPage > 1;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">
        Showing {startIndex} - {endIndex} orders
      </p>
      <div className="flex gap-2">
        <Button
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          variant="outline"
          className="px-3 py-2"
        >
          Previous
        </Button>
        <span className="px-3 py-2 text-sm">Page {currentPage}</span>
        <Button
          onClick={onNextPage}
          disabled={!canGoNext}
          variant="outline"
          className="px-3 py-2"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
