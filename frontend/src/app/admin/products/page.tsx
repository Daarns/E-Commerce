'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ProductSearch } from '@/components/admin/product/product-search';
import { ProductTable } from '@/components/admin/product/product-table';
import { AdminProduct } from '@/services/admin';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { calculateProductStats } from '@/utils/product.stats';
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
  const {
    products,
    isLoading,
    page,
    total,
    limit,
    filters,
    totalPages,
    handleFiltersChange,
    handleSort,
    handlePageChange,
    handleDelete,
  } = useAdminProducts();

  const stats = calculateProductStats(products);

  const handleEdit = (product: AdminProduct): void => {
    router.push(`/admin/products/${product.id}`);
  };

  const handleView = (product: AdminProduct): void => {
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
                <p className="text-3xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.outOfStock}</p>
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
              onSort={handleSort}
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
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                    />
                  </PaginationItem>
                )}

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={page === pageNum}
                        onClick={() => handlePageChange(pageNum)}
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
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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
