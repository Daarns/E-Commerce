'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Store,
  Bell,
  ShieldCheck,
  Database,
  Palette,
  ChevronRight,
  Save,
  Loader2,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function motionProps(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: 'easeOut' as const },
  };
}

// ─── Section nav ──────────────────────────────────────────────────────────────
const sections = [
  { id: 'store', label: 'Toko', icon: Store },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'security', label: 'Keamanan', icon: ShieldCheck },
  { id: 'system', label: 'Sistem', icon: Database },
  { id: 'appearance', label: 'Tampilan', icon: Palette },
] as const;

type SectionId = (typeof sections)[number]['id'];

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─── Setting row ──────────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  children,
  badge,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border/60 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('store');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Store settings
  const [storeName, setStoreName] = useState('Daarn Store');
  const [storeEmail, setStoreEmail] = useState('hello@daarn.store');
  const [storePhone, setStorePhone] = useState('+62 812 3456 7890');
  const [storeAddress, setStoreAddress] = useState('Jakarta, Indonesia');
  const [storeCurrency, setStoreCurrency] = useState('IDR');
  const [storeLogo, setStoreLogo] = useState('');

  // Notification settings
  const [notifNewOrder, setNotifNewOrder] = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifNewUser, setNotifNewUser] = useState(false);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('10');

  // Security settings
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [requireEmailVerif, setRequireEmailVerif] = useState(true);
  const [twoFactorAdmin, setTwoFactorAdmin] = useState(false);

  // System settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [logLevel, setLogLevel] = useState('info');

  // Appearance
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [itemsPerPage, setItemsPerPage] = useState('20');

  const handleSave = async () => {
    try {
      setSaving(true);
      // NOTE: Backend Settings API belum ada — ini simulasi.
      // Ketika backend Settings handler siap, panggil:
      //   await api.put('/admin/settings', { store_name: storeName, ... })
      await new Promise((r) => setTimeout(r, 800));
      setSaved(true);
      toast.success('Pengaturan berhasil disimpan');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header */}
        <motion.div {...motionProps(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Konfigurasi platform e-commerce Anda.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan Pengaturan'}
          </Button>
        </motion.div>

        {/* Backend notice */}
        <motion.div {...motionProps(0.05)}>
          <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Halaman ini siap secara UI. Backend Settings handler (GET/PUT <code className="font-mono text-xs">/api/v1/admin/settings</code>) perlu diimplementasi di sisi Go untuk persistensi.
            </p>
          </div>
        </motion.div>

        <motion.div {...motionProps(0.1)} className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Section nav */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    active === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {active !== id && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-40" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content panel */}
          <div className="md:col-span-3 space-y-6">

            {/* ── Store ── */}
            {active === 'store' && (
              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Informasi Toko</CardTitle>
                  </div>
                  <CardDescription>Detail dasar toko yang tampil ke pelanggan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Toko</Label>
                      <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mata Uang</Label>
                      <select
                        value={storeCurrency}
                        onChange={(e) => setStoreCurrency(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="IDR">IDR — Rupiah</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="SGD">SGD — Singapore Dollar</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Toko</Label>
                      <Input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nomor Telepon</Label>
                      <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Alamat</Label>
                      <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>URL Logo</Label>
                      <Input
                        value={storeLogo}
                        onChange={(e) => setStoreLogo(e.target.value)}
                        placeholder="https://cdn.example.com/logo.png"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Notifications ── */}
            {active === 'notifications' && (
              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Notifikasi</CardTitle>
                  </div>
                  <CardDescription>Atur notifikasi yang dikirim ke admin.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SettingRow label="Pesanan Baru" description="Notifikasi saat ada pesanan masuk">
                    <Toggle checked={notifNewOrder} onChange={setNotifNewOrder} />
                  </SettingRow>
                  <SettingRow label="Pembayaran Dikonfirmasi" description="Notifikasi saat Midtrans konfirmasi pembayaran">
                    <Toggle checked={notifPayment} onChange={setNotifPayment} />
                  </SettingRow>
                  <SettingRow label="Stok Hampir Habis" description="Notifikasi saat stok produk di bawah threshold">
                    <Toggle checked={notifLowStock} onChange={setNotifLowStock} />
                  </SettingRow>
                  <SettingRow label="Threshold Stok Rendah" description="Jumlah stok minimum sebelum notifikasi">
                    <Input
                      type="number"
                      min={1}
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Pengguna Baru Daftar" description="Notifikasi saat pelanggan baru mendaftar">
                    <Toggle checked={notifNewUser} onChange={setNotifNewUser} />
                  </SettingRow>
                  <SettingRow label="Kirim via Email" description="Duplikasikan notifikasi ke email admin" badge="SMTP Required">
                    <Toggle checked={notifEmail} onChange={setNotifEmail} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {/* ── Security ── */}
            {active === 'security' && (
              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Keamanan</CardTitle>
                  </div>
                  <CardDescription>Konfigurasi kebijakan keamanan platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SettingRow label="Timeout Sesi (menit)" description="Otomatis logout setelah tidak aktif">
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Maks. Percobaan Login" description="Blokir IP setelah gagal login N kali">
                    <Input
                      type="number"
                      min={3}
                      max={20}
                      value={maxLoginAttempts}
                      onChange={(e) => setMaxLoginAttempts(e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Verifikasi Email Wajib" description="Pelanggan harus verifikasi email sebelum bisa login">
                    <Toggle checked={requireEmailVerif} onChange={setRequireEmailVerif} />
                  </SettingRow>
                  <SettingRow label="2FA untuk Admin" description="Wajibkan Two-Factor Authentication untuk akun admin" badge="Coming Soon">
                    <Toggle checked={twoFactorAdmin} onChange={setTwoFactorAdmin} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {/* ── System ── */}
            {active === 'system' && (
              <div className="space-y-6">
                <Card className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">Sistem</CardTitle>
                    </div>
                    <CardDescription>Pengaturan teknis platform.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SettingRow label="Mode Maintenance" description="Tampilkan halaman maintenance ke semua pengunjung" badge="Hati-hati">
                      <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
                    </SettingRow>
                    <SettingRow label="Debug Mode" description="Log request detail — hanya aktifkan di development" badge="Dev Only">
                      <Toggle checked={debugMode} onChange={setDebugMode} />
                    </SettingRow>
                    <SettingRow label="Log Level" description="Level log backend Go">
                      <select
                        value={logLevel}
                        onChange={(e) => setLogLevel(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Item per Halaman" description="Default jumlah item di tabel admin">
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {['10', '20', '50', '100'].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </SettingRow>
                  </CardContent>
                </Card>

                {/* Backend info */}
                <Card className="border-border/60 bg-muted/20">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Info Backend</p>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Framework', value: 'Gin (Go)' },
                        { label: 'Database', value: 'PostgreSQL (Docker)' },
                        { label: 'Cache', value: 'Redis' },
                        { label: 'Storage', value: 'SeaweedFS' },
                        { label: 'Payment', value: 'Midtrans Snap (Sandbox)' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <Badge variant="outline" className="font-mono text-xs">{value}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Appearance ── */}
            {active === 'appearance' && (
              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Tampilan</CardTitle>
                  </div>
                  <CardDescription>Preferensi visual admin panel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Tema Default Admin</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'light', label: 'Terang', preview: 'bg-white border-2' },
                        { value: 'dark', label: 'Gelap', preview: 'bg-zinc-900 border-2' },
                        { value: 'system', label: 'Sistem', preview: 'bg-gradient-to-br from-white to-zinc-900 border-2' },
                      ] as const).map(({ value, label, preview }) => (
                        <button
                          key={value}
                          onClick={() => setDefaultTheme(value)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                            defaultTheme === value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <div className={`w-full h-12 rounded-md ${preview} ${defaultTheme === value ? 'border-primary' : 'border-border'}`} />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <SettingRow label="Item per Halaman (Table)" description="Default baris di semua tabel data">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {['10', '20', '50', '100'].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </SettingRow>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
