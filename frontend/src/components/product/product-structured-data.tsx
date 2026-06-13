import type { Product } from '@/types';
import { PUBLIC_SITE_URL, SITE_NAME } from '@/constants/seo.constants';
import { buildSeoDescription, getProductSeoImage } from '@/utils/seo.utils';

interface ProductStructuredDataProps {
  product: Product;
}

export function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const price = Number(product.effective_price ?? product.sale_price ?? product.regular_price);
  const image = getProductSeoImage(product);
  const availableStock = product.combinations?.length
    ? product.combinations
        .filter((combination) => combination.is_active)
        .reduce((total, combination) => total + combination.stock_quantity, 0)
    : product.stock_quantity;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: buildSeoDescription(product),
    sku: product.sku,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : { '@type': 'Brand', name: SITE_NAME },
    ...(image ? { image: [image] } : {}),
    offers: {
      '@type': 'Offer',
      url: `${PUBLIC_SITE_URL}/products/${product.slug}`,
      priceCurrency: 'IDR',
      price: Number.isFinite(price) ? price : 0,
      availability: availableStock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.avg_rating && product.review_count
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.avg_rating,
            reviewCount: product.review_count,
          },
        }
      : {}),
  };

  const serializedData = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializedData }}
    />
  );
}
