'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/layout';
import { ProductSearch } from '@/components/admin/product-search';
import { ProductTable } from '@/components/admin/product-table';
import { adminService, ProductFilters, AdminProduct } from '@/services/admin';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    loadProducts();
  }, [page, limit, filters]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getProducts(filters, page, limit);
      setProducts(response.data.products);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleEdit = (product: AdminProduct) => {
    router.push(`/admin/products/${product.id}`);
  };

  const handleDelete = async (productId: string) => {
    try {
      await adminService.deleteProduct(productId);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleView = (product: AdminProduct) => {
    // Navigate to product detail page or open modal
    router.push(`/products/${product.slug}`);
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product catalog
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/products/create')}
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {products.filter(p => p.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {products.filter(p => p.stock_quantity === 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearch
              onFiltersChange={handleFiltersChange}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Products List</CardTitle>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of{' '}
                {total} products
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ProductTable
              products={products}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              sortBy={filters.sort_by}
              sortOrder={filters.sort_order}
              onSort={(by, order) => {
                setFilters(prev => ({
                  ...prev,
                  sort_by: by as ProductFilters['sort_by'],
                  sort_order: order,
                }));
              }}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    />
                  </PaginationItem>
                )}

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={page === pageNum}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {totalPages > 5 && page < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}
