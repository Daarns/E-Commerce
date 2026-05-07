'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, Plus, Search, RefreshCw, Pencil, Trash2,
  CheckCircle2, XCircle, Calendar, Copy, Check, Loader2, Filter,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  promoAdminService,
  PromoCode,
  CreatePromoInput,
} from '@/services/admin';
import { formatCurrency } from '@/lib/utils';

// ─── Form data (UI-side, dates stored as YYYY-MM-DD then converted) ─────────
interface PromoFormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  usage_limit_per_user: number;
  valid_from: string; // YYYY-MM-DD (date picker)
  valid_to: string;   // YYYY-MM-DD
  is_active: boolean;
}

const defaultForm: PromoFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: 0,
  usage_limit: 100,
  usage_limit_per_user: 1,
  valid_from: new Date().toISOString().split('T')[0],
  valid_to: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  is_active: true,
};

/** Convert form data to CreatePromoInput — dates get T00:00:00Z suffix */
function toCreateInput(form: PromoFormData): CreatePromoInput {
  return {
    code: form.code,
    description: form.description || undefined,
    discount_type: form.discount_type,
    discount_value: form.discount_value,
    min_order_amount: form.min_order_amount || undefined,
    max_discount_amount: form.max_discount_amount || undefined,
    usage_limit: form.usage_limit || undefined,
    usage_limit_per_user: form.usage_limit_per_user,
    valid_from: `${form.valid_from}T00:00:00Z`,
    valid_to: `${form.valid_to}T23:59:59Z`,
    is_active: form.is_active,
  };
}

function motionProps(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: 'easeOut' as const },
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function PromoModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PromoFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code,
        description: initial.description ?? '',
        discount_type: initial.discount_type,
        discount_value: Number(initial.discount_value),
        min_order_amount: Number(initial.min_order_amount),
        max_discount_amount: Number(initial.max_discount_amount ?? 0),
        usage_limit: initial.usage_limit ?? 0,
        usage_limit_per_user: initial.usage_limit_per_user,
        valid_from: initial.valid_from?.split('T')[0] ?? '',
        valid_to: initial.valid_to?.split('T')[0] ?? '',
        is_active: initial.is_active,
      });
    } else {
      setForm(defaultForm);
    }
  }, [initial, open]);

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Kode promo wajib diisi'); return; }
    if (form.discount_value <= 0) { toast.error('Nilai diskon harus > 0'); return; }
    if (form.valid_to < form.valid_from) { toast.error('Tanggal akhir harus setelah tanggal mulai'); return; }
    try {
      setSaving(true);
      if (initial) {
        await promoAdminService.update(initial.id, {
          description: form.description || undefined,
          discount_value: form.discount_value,
          min_order_amount: form.min_order_amount || undefined,
          max_discount_amount: form.max_discount_amount || undefined,
          usage_limit: form.usage_limit || undefined,
          usage_limit_per_user: form.usage_limit_per_user,
          valid_to: `${form.valid_to}T23:59:59Z`,
          is_active: form.is_active,
        });
        toast.success('Promo diperbarui');
      } else {
        await promoAdminService.create(toCreateInput(form));
        toast.success('Promo berhasil dibuat');
      }
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
          ?? 'Gagal menyimpan promo';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{initial ? 'Edit Promo Code' : 'Tambah Promo Code'}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Code */}
          <div className="space-y-1.5">
            <Label>Kode Promo *</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="cth: HEMAT50"
              className="font-mono uppercase"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opsional"
            />
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipe Diskon</Label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nilai Diskon *</Label>
              <Input
                type="number"
                min={0}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                placeholder={form.discount_type === 'percentage' ? '10' : '50000'}
              />
            </div>
          </div>

          {/* Min order + max discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min. Order (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maks. Diskon (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: Number(e.target.value) })}
                placeholder="0 = tidak terbatas"
              />
            </div>
          </div>

          {/* Usage limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Maks. Penggunaan Total</Label>
              <Input
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maks. per User</Label>
              <Input
                type="number"
                min={1}
                value={form.usage_limit_per_user}
                onChange={(e) => setForm({ ...form, usage_limit_per_user: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Berlaku Dari</Label>
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Berlaku Sampai</Label>
              <Input
                type="date"
                value={form.valid_to}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Status Aktif</p>
              <p className="text-xs text-muted-foreground">Promo dapat digunakan oleh pelanggan</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.is_active ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? 'Simpan Perubahan' : 'Buat Promo'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Copy code button ──────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPromos = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await promoAdminService.list({
        code: search || undefined,
        is_active: filterActive || undefined,
        page,
        page_size: 20,
      });
      setPromos(result.promo_codes ?? []);
      setTotal(Number(result.total) ?? 0);
    } catch {
      toast.error('Gagal memuat promo codes');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterActive, page]);

  useEffect(() => { loadPromos(); }, [loadPromos]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus promo code ini?')) return;
    try {
      setDeleting(id);
      await promoAdminService.delete(id);
      toast.success('Promo code dihapus');
      loadPromos();
    } catch {
      toast.error('Gagal menghapus promo code');
    } finally {
      setDeleting(null);
    }
  };

  const activeCount = promos.filter((p) => p.is_active).length;
  const expiredCount = promos.filter((p) => new Date(p.valid_to) < new Date()).length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AdminLayout>
      <AnimatePresence>
        {modalOpen && (
          <PromoModal
            open={modalOpen}
            initial={editing}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSaved={loadPromos}
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
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Tambah Promo
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div {...motionProps(0.07)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Promo', value: total, color: 'text-foreground', bg: 'bg-muted/50' },
              { label: 'Aktif', value: activeCount, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
              { label: 'Kadaluarsa', value: expiredCount, color: 'text-rose-500', bg: 'bg-rose-500/5' },
              { label: 'Halaman', value: `${page} / ${Math.max(1, Math.ceil(total / 20))}`, color: 'text-muted-foreground', bg: 'bg-muted/50' },
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                  onClick={() => { setFilterActive(f.value); setPage(1); }}
                >
                  {f.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => loadPromos()} disabled={isLoading}>
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
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
                  <Plus className="h-4 w-4" /> Buat Promo Pertama
                </Button>
              </CardContent>
            ) : (
              /* ── Desktop table ── */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">Kode</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Diskon</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Min. Order</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Penggunaan</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Masa Berlaku</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">Status</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {promos.map((promo) => {
                      const isExpired = new Date(promo.valid_to) < new Date();
                      const usageCount = promo.usage_count ?? 0;
                      const usageLimit = promo.usage_limit ?? 0;
                      const usagePct = usageLimit > 0
                        ? Math.min((usageCount / usageLimit) * 100, 100)
                        : 0;
                      return (
                        <tr key={promo.id} className="hover:bg-muted/20 transition-colors">
                          {/* Kode + mobile summary */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-semibold tracking-wider">{promo.code}</span>
                              <CopyButton text={promo.code} />
                            </div>
                            {promo.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{promo.description}</p>
                            )}
                            {/* Mobile-only inline info */}
                            <div className="sm:hidden mt-1.5 flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {promo.discount_type === 'percentage'
                                  ? `${Number(promo.discount_value)}%`
                                  : formatCurrency(Number(promo.discount_value))}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(promo.valid_from)} → {formatDate(promo.valid_to)}
                              </span>
                            </div>
                          </td>

                          {/* Diskon — hidden on mobile */}
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <Badge variant="secondary" className="font-mono">
                              {promo.discount_type === 'percentage'
                                ? `${Number(promo.discount_value)}%`
                                : formatCurrency(Number(promo.discount_value))}
                            </Badge>
                          </td>

                          {/* Min. Order — hidden sm */}
                          <td className="py-3 px-4 text-muted-foreground tabular-nums hidden md:table-cell">
                            {Number(promo.min_order_amount) > 0
                              ? formatCurrency(Number(promo.min_order_amount))
                              : '—'}
                          </td>

                          {/* Penggunaan — hidden md */}
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="tabular-nums">{usageCount}&thinsp;/&thinsp;{usageLimit > 0 ? usageLimit : '∞'}</span>
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

                          {/* Masa Berlaku — hidden md */}
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formatDate(promo.valid_from)}
                              </div>
                              <div className={`text-xs ${isExpired ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                → {formatDate(promo.valid_to)}
                                {isExpired && ' ·  kadaluarsa'}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
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

                          {/* Aksi — always visible */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => { setEditing(promo); setModalOpen(true); }}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(promo.id)}
                                disabled={deleting === promo.id}
                                title="Hapus"
                              >
                                {deleting === promo.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
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
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Halaman {page} dari {Math.ceil(total / 20)}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}>
              Selanjutnya
            </Button>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
