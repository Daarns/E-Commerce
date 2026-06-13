import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/constants/seo.constants';
import { getSitemapProducts } from '@/services/seo/seo.service';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: PUBLIC_SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${PUBLIC_SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${PUBLIC_SITE_URL}/products/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
