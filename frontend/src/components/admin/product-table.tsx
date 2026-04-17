'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Edit2,
  Trash2,
  Eye,
  ChevronUp,
  ChevronDown,
  Loader2,
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
import { AdminProduct } from '@/services/admin';
import { formatCurrency } from '@/lib/utils';

interface ProductTableProps {
  products: AdminProduct[];
  isLoading?: boolean;
  onEdit: (product: AdminProduct) => void;
  onDelete: (productId: string) => Promise<void>;
  onView: (product: AdminProduct) => void;
  sortBy?: 'name' | 'price' | 'stock' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  onSort?: (by: string, order: 'asc' | 'desc') => void;
}

const getStockStatus = (stock: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' };
  if (stock < 10) return { label: 'Low Stock', variant: 'secondary' };
  return { label: 'In Stock', variant: 'default' };
};

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

  const handleSort = (column: string) => {
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
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
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
                      {product.image_urls[0] && (
                        <img
                          src={product.image_urls[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover"
                        />
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
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
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
              onClick={() => {
                // Handle bulk delete
                const ids = Array.from(selectedIds);
                // TODO: Implement bulk delete
              }}
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
