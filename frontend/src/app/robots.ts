import type { MetadataRoute } from 'next';
import { PRIVATE_ROUTES, PUBLIC_SITE_URL } from '@/constants/seo.constants';

export default function robots(): MetadataRoute.Robots {
  const indexingEnabled = process.env.SITE_INDEXING_ENABLED === 'true';

  if (!indexingEnabled) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products', '/products/'],
        disallow: [...PRIVATE_ROUTES, '/api/'],
      },
      { userAgent: ['GPTBot', 'CCBot', 'Google-Extended'], disallow: '/' },
    ],
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
    host: PUBLIC_SITE_URL,
  };
}
