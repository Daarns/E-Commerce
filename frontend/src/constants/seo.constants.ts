import type { Metadata } from 'next';

export const SITE_NAME = 'STORE';
export const SITE_DESCRIPTION =
  'Belanja produk fashion, aksesori, dan kebutuhan pilihan dengan transaksi aman dan pengalaman belanja yang praktis.';

export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export const PRIVATE_ROUTE_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const PRIVATE_ROUTES = [
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/cart',
  '/checkout',
  '/wishlist',
  '/profile',
  '/orders',
  '/chat',
  '/payment',
] as const;
