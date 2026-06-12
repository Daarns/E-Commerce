const LOCAL_S3_PUBLIC_PREFIXES = [
  'http://localhost:8333/',
  'http://127.0.0.1:8333/',
];

const LOCAL_FILER_PUBLIC_BASE = 'http://localhost:8888/buckets/';

export function normalizeStorageImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;

  const matchedPrefix = LOCAL_S3_PUBLIC_PREFIXES.find((prefix) => trimmedUrl.startsWith(prefix));
  if (!matchedPrefix) return trimmedUrl;

  return `${LOCAL_FILER_PUBLIC_BASE}${trimmedUrl.slice(matchedPrefix.length)}`;
}

export function shouldBypassNextImageOptimizer(url: string | null | undefined): boolean {
  const normalizedUrl = normalizeStorageImageUrl(url);
  return typeof normalizedUrl === 'string' && (
    normalizedUrl.startsWith('http://localhost:8888') ||
    normalizedUrl.startsWith('http://127.0.0.1:8888') ||
    normalizedUrl.endsWith('.svg')
  );
}
