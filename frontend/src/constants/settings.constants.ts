export const SETTINGS_SECTIONS = [
  { id: 'store', label: 'Toko', icon: 'Store' },
  { id: 'notifications', label: 'Notifikasi', icon: 'Bell' },
  { id: 'security', label: 'Keamanan', icon: 'ShieldCheck' },
  { id: 'system', label: 'Sistem', icon: 'Database' },
  { id: 'appearance', label: 'Tampilan', icon: 'Palette' },
] as const;

export type SectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR — Rupiah' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
];

export const LOG_LEVEL_OPTIONS = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
];

export const ITEMS_PER_PAGE_OPTIONS = ['10', '20', '50', '100'];

export const THEME_OPTIONS = [
  { value: 'light', label: 'Terang', preview: 'bg-white border-2' },
  { value: 'dark', label: 'Gelap', preview: 'bg-zinc-900 border-2' },
  { value: 'system', label: 'Sistem', preview: 'bg-gradient-to-br from-white to-zinc-900 border-2' },
] as const;

export const BACKEND_INFO = [
  { label: 'Framework', value: 'Gin (Go)' },
  { label: 'Database', value: 'PostgreSQL (Docker)' },
  { label: 'Cache', value: 'Redis' },
  { label: 'Storage', value: 'SeaweedFS' },
  { label: 'Payment', value: 'Midtrans Snap (Sandbox)' },
];
