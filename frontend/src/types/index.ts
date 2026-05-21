/**
 * types/index.ts — Barrel re-export only.
 *
 * Import from here: import { User, Product, Order } from '@/types'
 * Or import directly: import { Order } from '@/types/order'
 *
 * Domain files:
 *   user.ts    → User, AuthResponse
 *   product.ts → Product, ProductImage, ProductVariantCombination, Category, ProductFilter
 *   cart.ts    → Cart, CartItem, ValidCartItem
 *   order.ts   → Order, OrderItem, OrderStatus, PaymentStatus, Address
 *   api.ts     → ApiResponse<T>
 */

export * from './user';
export * from './product';
export * from './cart';
export * from './order';
export * from './api';
