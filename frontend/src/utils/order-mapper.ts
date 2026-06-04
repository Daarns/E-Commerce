import { Order, OrderItem } from '@/types';
import { getProductImageForCombination, getProductImageUrl } from './product.utils';

/**
 * Converts flat address fields to nested address object
 */
export function buildShippingAddress(order: Order) {
  if (order.shipping_address) {
    return order.shipping_address;
  }

  return {
    recipient_name: order.shipping_name,
    phone: order.shipping_phone,
    street_address: order.shipping_address_line1,
    address_line2: order.shipping_address_line2,
    city: order.shipping_city,
    province: order.shipping_province,
    postal_code: order.shipping_postal_code,
  };
}

/**
 * Normalizes prices from string to number
 */
export function normalizePrice(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  return parseFloat(value) || 0;
}

/**
 * Normalizes order item prices
 */
export function normalizeOrderItem(item: OrderItem): OrderItem {
  const subtotal = normalizePrice(item.subtotal);

  return {
    ...item,
    unit_price: normalizePrice(item.unit_price),
    subtotal,
    total_price: normalizePrice(item.total_price ?? subtotal),
  };
}

/**
 * Normalizes all order data for frontend consumption
 */
export function normalizeOrder(order: Order): Order {
  return {
    ...order,
    subtotal: normalizePrice(order.subtotal),
    shipping_cost: normalizePrice(order.shipping_cost),
    discount_amount: normalizePrice(order.discount_amount),
    tax_amount: normalizePrice(order.tax_amount),
    total: normalizePrice(order.total),
    total_amount: normalizePrice(order.total_amount || order.total),
    status: order.status || order.order_status,
    shipping_address: buildShippingAddress(order),
    items: order.items ? order.items.map(normalizeOrderItem) : [],
  };
}

/**
 * Normalizes a list of order items
 */
export function normalizeOrderItems(items: OrderItem[]): OrderItem[] {
  return items.map(normalizeOrderItem);
}

export function getOrderItemImageUrl(item: OrderItem): string | undefined {
  if (item.product_image) {
    return item.product_image;
  }

  return getProductImageUrl(
    getProductImageForCombination(item.product?.images, item.combination)
  );
}
