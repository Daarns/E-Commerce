'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
  Filter,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PromoCode } from '@/services/admin';
import { useAdminPromos } from '@/hooks/useAdminPromos';
import { PromoModal } from '@/components/admin/promo/promo-modal';
import { CopyButton } from '@/components/admin/shared/copy-button';
import { calculatePromoStats, formatPromoDate, formatDiscountValue, isPromoExpired } from '@/utils/promo.stats';
import { formatCurrency } from '@/utils';

function motionProps(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: 'easeOut' as const },
  };
}

export default function PromoCodesPage() {
  const {
    promos,
    isLoading,
    total,
    page,
    search,
    filterActive,
    handleSearch,
    handleFilterActive,
    handlePageChange,
    handleDelete,
    refresh,
  } = useAdminPromos();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const stats = calculatePromoStats(promos);
  const totalPages = Math.ceil(total / 20);

  const handleDeleteWithConfirm = useCallback(
    async (id: string): Promise<void> => {
      if (!confirm('Yakin ingin menghapus promo code ini?')) return;
      try {
        setDeleting(id);
        await handleDelete(id);
      } finally {
        setDeleting(null);
      }
    },
    [handleDelete]
  );

  return (
    <AdminLayout>
      <AnimatePresence>
        {modalOpen && (
          <PromoModal
            open={modalOpen}
            initial={editing}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSaved={refresh}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Header */}
        <motion.div {...motionProps(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola kode diskon dan kampanye promosi.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Promo
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div {...motionProps(0.07)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Promo', value: total, color: 'text-foreground', bg: 'bg-muted/50' },
              { label: 'Aktif', value: stats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
              { label: 'Kadaluarsa', value: stats.expired, color: 'text-rose-500', bg: 'bg-rose-500/5' },
              {
                label: 'Halaman',
                value: `${page} / ${Math.max(1, totalPages)}`,
                color: 'text-muted-foreground',
                bg: 'bg-muted/50',
              },
            ].map((s) => (
              <Card key={s.label} className={`border-border/60 ${s.bg}`}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Filter bar */}
        <motion.div {...motionProps(0.14)}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari kode promo..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              {[
                { label: 'Semua', value: '' },
                { label: 'Aktif', value: 'true' },
                { label: 'Nonaktif', value: 'false' },
              ].map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={filterActive === f.value ? 'default' : 'outline'}
                  onClick={() => handleFilterActive(f.value)}
                >
                  {f.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div {...motionProps(0.21)}>
          <Card className="border-border/60 overflow-hidden">
            {isLoading ? (
              <CardContent className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            ) : promos.length === 0 ? (
              <CardContent className="p-12 text-center">
                <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'Tidak ada promo yang cocok' : 'Belum ada promo code'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => {
                    setEditing(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Buat Promo Pertama
                </Button>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                        Kode
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">
                        Diskon
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                        Min. Order
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                        Penggunaan
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                        Masa Berlaku
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {promos.map((promo) => {
                      const isExpired = isPromoExpired(promo.valid_to);
                      const usageCount = promo.usage_count ?? 0;
                      const usageLimit = promo.usage_limit ?? 0;
                      const usagePct = usageLimit > 0 ? Math.min((usageCount / usageLimit) * 100, 100) : 0;

                      return (
                        <tr key={promo.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-semibold tracking-wider">{promo.code}</span>
                              <CopyButton text={promo.code} />
                            </div>
                            {promo.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                                {promo.description}
                              </p>
                            )}
                            <div className="sm:hidden mt-1.5 flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {formatDiscountValue(promo.discount_value, promo.discount_type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatPromoDate(promo.valid_from)} → {formatPromoDate(promo.valid_to)}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 hidden sm:table-cell">
                            <Badge variant="secondary" className="font-mono">
                              {formatDiscountValue(promo.discount_value, promo.discount_type)}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-muted-foreground tabular-nums hidden md:table-cell">
                            {Number(promo.min_order_amount) > 0 ? formatCurrency(Number(promo.min_order_amount)) : '—'}
                          </td>

                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="tabular-nums">
                                  {usageCount}&thinsp;/&thinsp;{usageLimit > 0 ? usageLimit : '∞'}
                                </span>
                                <span className="text-muted-foreground ml-2">{usagePct.toFixed(0)}%</span>
                              </div>
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    usagePct >= 90 ? 'bg-rose-500' : usagePct >= 60 ? 'bg-orange-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.max(usagePct, usageLimit > 0 ? 1 : 0)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formatPromoDate(promo.valid_from)}
                              </div>
                              <div className={`text-xs ${isExpired ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                → {formatPromoDate(promo.valid_to)}
                                {isExpired && ' · kadaluarsa'}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {promo.is_active && !isExpired ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" /> Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground gap-1 whitespace-nowrap">
                                <XCircle className="h-3 w-3" />
                                {isExpired ? 'Kadaluarsa' : 'Nonaktif'}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => {
                                  setEditing(promo);
                                  setModalOpen(true);
                                }}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteWithConfirm(promo.id)}
                                disabled={deleting === promo.id}
                                title="Hapus"
                              >
                                {deleting === promo.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Pagination */}
        {total > 20 && (
          <motion.div {...motionProps(0.28)} className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Selanjutnya
            </Button>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
