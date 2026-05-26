'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Edit2,
  Trash2,
  Eye,
  ChevronUp,
  ChevronDown,
  Loader2,
  MoreVertical,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminProduct, ProductFilters } from '@/services/admin';
import {
  getAdminProductStatusLabel,
  LOW_STOCK_THRESHOLD,
  PRODUCT_STOCK_STATUS,
} from '@/constants/product.constants';
import { formatCurrency } from '@/utils';

interface ProductTableProps {
  products: AdminProduct[];
  isLoading?: boolean;
  onEdit: (product: AdminProduct) => void;
  onDelete: (productId: string) => Promise<void>;
  onView: (product: AdminProduct) => void;
  sortBy?: ProductFilters['sort_by'];
  sortOrder?: 'asc' | 'desc';
  onSort?: (by: ProductFilters['sort_by'], order: 'asc' | 'desc') => void;
}

const getStockStatus = (stock: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (stock === 0) return PRODUCT_STOCK_STATUS.outOfStock;
  if (stock < LOW_STOCK_THRESHOLD) return PRODUCT_STOCK_STATUS.lowStock;
  return PRODUCT_STOCK_STATUS.inStock;
};

const getProductStatusVariant = (
  status: string | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'archived':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getFirstImageUrl = (imageUrls?: string[]): string | null => {
  return imageUrls?.find((url) => typeof url === 'string' && url.trim().length > 0) ?? null;
};

function ProductTableSkeleton(): ReactElement {
  return (
    <div className="space-y-3">
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[48px_1.8fr_1fr_1fr_1fr_1fr_96px] gap-4 border-b p-4">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[48px_1.8fr_1fr_1fr_1fr_1fr_96px] items-center gap-4 border-b p-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-12" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="mx-auto h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-14 w-14 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductTable({
  products,
  isLoading = false,
  onEdit,
  onDelete,
  onView,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onSort,
}: ProductTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (column: ProductFilters['sort_by']) => {
    if (!onSort) return;

    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortBy === column && sortOrder === 'asc') {
      newOrder = 'desc';
    }

    onSort(column, newOrder);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteConfirm);
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <span className="text-muted-foreground">⬍</span>;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return <ProductTableSkeleton />;
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table (hidden on mobile) ── */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === products.length && products.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-2 font-semibold hover:text-foreground"
                  onClick={() => handleSort('name')}
                >
                  Product Name <SortIcon column="name" />
                </button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <button
                  className="flex items-center gap-2 font-semibold hover:text-foreground ml-auto"
                  onClick={() => handleSort('price')}
                >
                  Price <SortIcon column="price" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  className="flex items-center gap-2 font-semibold hover:text-foreground ml-auto"
                  onClick={() => handleSort('stock')}
                >
                  Stock <SortIcon column="stock" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, idx) => {
              const stockStatus = getStockStatus(product.stock_quantity);
              const isSelected = selectedIds.has(product.id);
              const imageUrl = getFirstImageUrl(product.image_urls);

              return (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border-t ${isSelected ? 'bg-muted' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{product.category_name}</p>
                      {product.subcategory_name && (
                        <p className="text-xs text-muted-foreground">{product.subcategory_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-medium">{formatCurrency(product.price)}</p>
                    {(product.discount_percentage ?? 0) > 0 && (
                      <p className="text-xs text-amber-600">
                        -{product.discount_percentage}%
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">{product.stock_quantity}</p>
                      <p className="text-xs text-muted-foreground">in stock</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getProductStatusVariant(product.status)}>
                        {getAdminProductStatusLabel(product.status)}
                      </Badge>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(product)}
                        title="View product"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(product.id)}
                        title="Delete product"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile Card Layout (hidden on desktop) ── */}
      <div className="md:hidden space-y-3">
        {products.map((product, idx) => {
          const stockStatus = getStockStatus(product.stock_quantity);
          const imageUrl = getFirstImageUrl(product.image_urls);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border rounded-lg p-3 space-y-3"
            >
              {/* Top row: image + name + actions */}
              <div className="flex items-start gap-3">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
                  )}
                  {product.category_name && (
                    <p className="text-xs text-muted-foreground">{product.category_name}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(product)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirm(product.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Bottom row: price + stock + status */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t">
                <div>
                  <p className="font-semibold text-sm">{formatCurrency(product.price)}</p>
                  {(product.discount_percentage ?? 0) > 0 && (
                    <span className="text-xs text-amber-600">-{product.discount_percentage}%</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{product.stock_quantity}</p>
                  <p className="text-[10px] text-muted-foreground">stock</p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={getProductStatusVariant(product.status)} className="text-[10px] px-1.5 py-0">
                    {getAdminProductStatusLabel(product.status)}
                  </Badge>
                  <Badge variant={stockStatus.variant} className="text-[10px] px-1.5 py-0">
                    {stockStatus.label}
                  </Badge>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg mt-4"
        >
          <p className="text-sm font-medium">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled
              title="Bulk delete is not implemented yet"
            >
              Delete Selected
            </Button>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
