// Format utilities (global - used everywhere)
export { toNum, formatCurrency, formatDate, formatDateTime, formatCountdown } from './format';
export {
  buildSelectedOptionsFromCombination,
  calculateDiscountPercentage,
  findMatchingCombination,
  getAvailableOptionIdsForType,
  getCombinationOptionIds,
  getProductCardImages,
  getProductCardPricing,
  getProductGalleryImages,
  getInitialProductImageIndex,
  getProductImageForCombination,
  getProductImageUrl,
  getProductPriceRange,
  getProductPricing,
  getUniqueProductImages,
} from './product.utils';
export type {
  ProductCardImages,
  ProductCardPricing,
  ProductGalleryImage,
  ProductPriceRange,
  ProductPricing,
} from './product.utils';

// String utilities
export { truncate, slugify } from './string';

// Function utilities
export { debounce } from './function';

// Crypto utilities
export { generateIdempotencyKey } from './crypto';

// Order domain utilities
export { getOrderItemImageUrl, normalizeOrder, normalizeOrderItem, normalizeOrderItems } from './order-mapper';
export { getRefundRequestAttemptNumber, getRefundRequestInfo } from './order-refund.utils';
export type { RefundRequestInfo } from './order-refund.utils';
export { getPaymentExpiryLabel, isOrderPaymentRetryable, isOrderPaymentSyncable } from './order-payment.utils';

// Auth domain utilities
export { validateEmail, validateLoginForm, validateRegisterForm } from './auth.validation';
