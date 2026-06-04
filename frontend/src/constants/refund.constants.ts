export const CUSTOMER_REFUND_REASON_OPTIONS = [
  { value: 'wrong_product', label: 'Produk yang diterima salah' },
  { value: 'damaged_product', label: 'Produk rusak atau cacat' },
  { value: 'not_as_described', label: 'Produk tidak sesuai deskripsi' },
  { value: 'missing_item', label: 'Item pesanan tidak lengkap' },
  { value: 'late_delivery', label: 'Pengiriman terlalu terlambat' },
  { value: 'other', label: 'Lainnya' },
] as const;

export const ADMIN_REFUND_REASON_OPTIONS = [
  'Customer Request',
  'Product Defect',
  'Wrong Product Sent',
  'Product Not as Described',
  'Missing Item',
  'Late Delivery',
  'Other',
] as const;

export const ADMIN_REFUND_REJECTION_REASON_OPTIONS = [
  'Evidence does not match claim',
  'Product condition not eligible',
  'Refund window expired',
  'Incomplete evidence',
  'Customer claim cannot be verified',
  'Other',
] as const;
