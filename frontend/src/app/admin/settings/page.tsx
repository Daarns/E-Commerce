'use client';

import { motion } from 'framer-motion';
import {
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
import { useState } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { Toggle } from '@/components/admin/toggle';
import { SettingRow } from '@/components/admin/setting-row';
import {
  SETTINGS_SECTIONS,
  CURRENCY_OPTIONS,
  LOG_LEVEL_OPTIONS,
  ITEMS_PER_PAGE_OPTIONS,
  THEME_OPTIONS,
  BACKEND_INFO,
} from '@/constants/settings.constants';
import type { SectionId } from '@/constants/settings.constants';

function motionProps(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: 'easeOut' as const },
  };
}

const iconMap = {
  Store,
  Bell,
  ShieldCheck,
  Database,
  Palette,
} as const;

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('store');
  const { settings, updateSetting, isSaving, saved, handleSave } = useAdminSettings();

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
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 shrink-0">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan Pengaturan'}
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
              {SETTINGS_SECTIONS.map(({ id, label, icon }) => {
                const Icon = iconMap[icon];
                return (
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
                );
              })}
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
                      <Input
                        value={settings.store.name}
                        onChange={(e) => updateSetting('store', 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mata Uang</Label>
                      <select
                        value={settings.store.currency}
                        onChange={(e) => updateSetting('store', 'currency', e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {CURRENCY_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Toko</Label>
                      <Input
                        type="email"
                        value={settings.store.email}
                        onChange={(e) => updateSetting('store', 'email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nomor Telepon</Label>
                      <Input
                        value={settings.store.phone}
                        onChange={(e) => updateSetting('store', 'phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Alamat</Label>
                      <Input
                        value={settings.store.address}
                        onChange={(e) => updateSetting('store', 'address', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>URL Logo</Label>
                      <Input
                        value={settings.store.logo}
                        onChange={(e) => updateSetting('store', 'logo', e.target.value)}
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
                    <Toggle checked={settings.notifications.newOrder} onChange={(v) => updateSetting('notifications', 'newOrder', v)} />
                  </SettingRow>
                  <SettingRow label="Pembayaran Dikonfirmasi" description="Notifikasi saat Midtrans konfirmasi pembayaran">
                    <Toggle checked={settings.notifications.payment} onChange={(v) => updateSetting('notifications', 'payment', v)} />
                  </SettingRow>
                  <SettingRow label="Stok Hampir Habis" description="Notifikasi saat stok produk di bawah threshold">
                    <Toggle checked={settings.notifications.lowStock} onChange={(v) => updateSetting('notifications', 'lowStock', v)} />
                  </SettingRow>
                  <SettingRow label="Threshold Stok Rendah" description="Jumlah stok minimum sebelum notifikasi">
                    <Input
                      type="number"
                      min={1}
                      value={settings.notifications.lowStockThreshold}
                      onChange={(e) => updateSetting('notifications', 'lowStockThreshold', e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Pengguna Baru Daftar" description="Notifikasi saat pelanggan baru mendaftar">
                    <Toggle checked={settings.notifications.newUser} onChange={(v) => updateSetting('notifications', 'newUser', v)} />
                  </SettingRow>
                  <SettingRow label="Kirim via Email" description="Duplikasikan notifikasi ke email admin" badge="SMTP Required">
                    <Toggle checked={settings.notifications.email} onChange={(v) => updateSetting('notifications', 'email', v)} />
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
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Maks. Percobaan Login" description="Blokir IP setelah gagal login N kali">
                    <Input
                      type="number"
                      min={3}
                      max={20}
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSetting('security', 'maxLoginAttempts', e.target.value)}
                      className="w-20 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Verifikasi Email Wajib" description="Pelanggan harus verifikasi email sebelum bisa login">
                    <Toggle checked={settings.security.requireEmailVerif} onChange={(v) => updateSetting('security', 'requireEmailVerif', v)} />
                  </SettingRow>
                  <SettingRow label="2FA untuk Admin" description="Wajibkan Two-Factor Authentication untuk akun admin" badge="Coming Soon">
                    <Toggle checked={settings.security.twoFactorAdmin} onChange={(v) => updateSetting('security', 'twoFactorAdmin', v)} />
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
                      <Toggle checked={settings.system.maintenanceMode} onChange={(v) => updateSetting('system', 'maintenanceMode', v)} />
                    </SettingRow>
                    <SettingRow label="Debug Mode" description="Log request detail — hanya aktifkan di development" badge="Dev Only">
                      <Toggle checked={settings.system.debugMode} onChange={(v) => updateSetting('system', 'debugMode', v)} />
                    </SettingRow>
                    <SettingRow label="Log Level" description="Level log backend Go">
                      <select
                        value={settings.system.logLevel}
                        onChange={(e) => updateSetting('system', 'logLevel', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {LOG_LEVEL_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </SettingRow>
                    <SettingRow label="Item per Halaman" description="Default jumlah item di tabel admin">
                      <select
                        value={settings.system.itemsPerPage}
                        onChange={(e) => updateSetting('system', 'itemsPerPage', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {ITEMS_PER_PAGE_OPTIONS.map((n) => (
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
                      {BACKEND_INFO.map(({ label, value }) => (
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
                      {THEME_OPTIONS.map(({ value, label, preview }) => (
                        <button
                          key={value}
                          onClick={() => updateSetting('appearance', 'defaultTheme', value)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                            settings.appearance.defaultTheme === value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <div className={`w-full h-12 rounded-md ${preview} ${settings.appearance.defaultTheme === value ? 'border-primary' : 'border-border'}`} />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <SettingRow label="Item per Halaman (Table)" description="Default baris di semua tabel data">
                    <select
                      value={settings.appearance.itemsPerPage}
                      onChange={(e) => updateSetting('appearance', 'itemsPerPage', e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
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
