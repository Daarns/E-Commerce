import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Temukan produk pilihan, fashion, aksesori, dan kebutuhan lainnya di STORE.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'Products | STORE',
    description: 'Temukan produk pilihan dan kebutuhan lainnya di STORE.',
    url: '/products',
    type: 'website',
  },
};

export default function ProductsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
