import type { Metadata } from 'next';
import { getSeoProduct } from '@/services/seo/seo.service';
import { buildSeoDescription, getProductSeoImage } from '@/utils/seo.utils';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getSeoProduct(slug);

  if (!product) {
    return {
      title: 'Produk tidak tersedia',
      robots: { index: false, follow: false },
    };
  }

  const title = product.meta_title || product.name;
  const description = buildSeoDescription(product);
  const image = getProductSeoImage(product);

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/products/${product.slug}`,
      type: 'website',
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children;
}
