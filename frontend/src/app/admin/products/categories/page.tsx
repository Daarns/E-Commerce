'use client';

import { FolderTree, Plus, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { CategoryDeleteDialog } from '@/components/admin/category/CategoryDeleteDialog';
import { CategoryModal } from '@/components/admin/category/CategoryModal';
import { CategoryTable } from '@/components/admin/category/CategoryTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminCategoryStatusFilter } from '@/services/admin';
import { useAdminCategories } from '@/hooks/useAdminCategories';

const filterOptions: Array<{ label: string; value: AdminCategoryStatusFilter }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

export default function AdminProductCategoriesPage() {
  const categories = useAdminCategories();

  return (
    <AdminLayout>
      <CategoryModal
        open={categories.modalOpen}
        isEdit={Boolean(categories.editingCategory)}
        isSaving={categories.isSaving}
        formData={categories.formData}
        parentOptions={categories.rootCategoryOptions}
        error={categories.error}
        onClose={categories.closeModal}
        onSave={categories.saveCategory}
        onFieldChange={categories.setFormField}
      />
      <CategoryDeleteDialog
        category={categories.pendingDeleteCategory}
        isDeleting={categories.isSaving}
        onCancel={categories.cancelDeleteCategory}
        onConfirm={categories.confirmDeleteCategory}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kelola struktur kategori untuk katalog produk.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void categories.refresh()} disabled={categories.isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${categories.isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={categories.openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kategori
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{categories.stats.total}</p>
              <p className="text-xs text-muted-foreground">Total kategori</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{categories.stats.active}</p>
              <p className="text-xs text-muted-foreground">Aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{categories.stats.inactive}</p>
              <p className="text-xs text-muted-foreground">Nonaktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{categories.stats.root}</p>
              <p className="text-xs text-muted-foreground">Root kategori</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="h-4 w-4" />
              Category List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={categories.statusFilter === option.value ? 'default' : 'outline'}
                    onClick={() => categories.setStatusFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Menampilkan {categories.categories.length} dari {categories.total} kategori
              </p>
            </div>

            <CategoryTable
              categories={categories.categories}
              parentOptions={categories.rootCategoryOptions}
              isLoading={categories.isLoading}
              onEdit={categories.openEdit}
              onDelete={categories.requestDeleteCategory}
            />

            {categories.totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {categories.page} of {categories.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={categories.page <= 1 || categories.isLoading}
                    onClick={() => categories.setPage(categories.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={categories.page >= categories.totalPages || categories.isLoading}
                    onClick={() => categories.setPage(categories.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
