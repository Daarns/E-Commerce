'use client';

import { Button } from '@/components/ui/button';

interface ProductsEmptyProps {
  onClearFilters: () => void;
}

export function ProductsEmpty({ onClearFilters }: ProductsEmptyProps) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">No products found</p>
      <Button onClick={onClearFilters}>Clear Filters</Button>
    </div>
  );
}
