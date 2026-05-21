'use client';

import { Edit2, FolderTree, Hash, Layers, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Category } from '@/types';

interface CategoryTableProps {
  categories: Category[];
  parentOptions: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function getParentName(category: Category, parentOptions: Category[]): string {
  if (!category.parent_id) return '-';
  return parentOptions.find((item) => item.id === category.parent_id)?.name ?? category.parent_id;
}

export function CategoryTable({
  categories,
  parentOptions,
  isLoading,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="text-center">
          <FolderTree className="mx-auto mb-3 h-11 w-11 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Belum ada kategori</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.slug}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getParentName(category, parentOptions)}
                </TableCell>
                <TableCell>
                  <Badge variant={category.is_active ?? true ? 'default' : 'secondary'}>
                    {category.is_active ?? true ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {categories.map((category) => {
          const isActive = category.is_active ?? true;
          const parentName = getParentName(category, parentOptions);

          return (
            <div key={category.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FolderTree className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{category.name}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="truncate">{category.slug}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={isActive ? 'default' : 'secondary'} className="shrink-0">
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Parent</span>
                <span className="ml-auto truncate font-medium">{parentName}</span>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(category)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
