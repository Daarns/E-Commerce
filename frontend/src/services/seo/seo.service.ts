import 'server-only';

import type { Product } from '@/types';

interface ProductListPayload {
  products: Product[];
  total_pages: number;
}

const API_BASE_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080/api/v1'
).replace(/\/$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    value.status === 'active';
}

function parseProduct(value: unknown): Product | null {
  if (!isRecord(value) || !isProduct(value.data)) return null;
  return value.data;
}

function parseProductList(value: unknown): ProductListPayload {
  if (!isRecord(value) || !isRecord(value.data)) {
    return { products: [], total_pages: 1 };
  }

  const rawProducts = Array.isArray(value.data.products) ? value.data.products : [];
  const products = rawProducts.filter(isProduct);
  const meta = isRecord(value.meta) ? value.meta : undefined;
  const rawTotalPages = meta?.total_pages ?? value.data.total_pages;
  const totalPages = typeof rawTotalPages === 'number' && rawTotalPages > 0
    ? Math.floor(rawTotalPages)
    : 1;

  return { products, total_pages: totalPages };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export async function getSeoProduct(slug: string): Promise<Product | null> {
  try {
    return parseProduct(await fetchJson(`${API_BASE_URL}/products/${encodeURIComponent(slug)}`));
  } catch {
    return null;
  }
}

export async function getSitemapProducts(): Promise<Product[]> {
  try {
    const firstPage = parseProductList(
      await fetchJson(`${API_BASE_URL}/products?page=1&limit=100&sort_by=created_at&sort_order=desc`),
    );
    const pageCount = Math.min(firstPage.total_pages, 500);

    if (pageCount <= 1) return firstPage.products;

    const products = [...firstPage.products];
    for (let page = 2; page <= pageCount; page += 1) {
      const result = parseProductList(
        await fetchJson(`${API_BASE_URL}/products?page=${page}&limit=100&sort_by=created_at&sort_order=desc`),
      );
      products.push(...result.products);
    }

    return products;
  } catch {
    return [];
  }
}
