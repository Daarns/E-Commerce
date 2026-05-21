export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID() for better randomness (requires Node.js 15.7.0+)
  // Fallback to timestamp + random for older environments
  try {
    return `${Date.now()}-${crypto.randomUUID()}`;
  } catch {
    // Fallback if crypto.randomUUID is not available
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
