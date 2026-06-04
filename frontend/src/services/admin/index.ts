/**
 * services/admin/index.ts — Barrel re-export only.
 *
 * All components that import from '@/services/admin' continue to work unchanged.
 * Internally, logic is now split per domain:
 *
 *   analytics.service.ts → revenue, orders, customers, product performance analytics
 *   dashboard.service.ts → dashboard summary (home page)
 *   product.service.ts   → admin product CRUD, image upload, bulk ops
 *   order.service.ts     → admin order list, get, status update, refund
 *   user.service.ts      → admin user list, get, role/status management
 *   promo.service.ts     → promo code CRUD (admin)
 *   category.service.ts  → admin category CRUD
 */

// ─── Re-export all domain types ───────────────────────────────────────────────
export type { RevenueMetrics, OrderMetrics, CustomerMetrics, RevenueTrend, ProductPerformance, AnalyticsResponse } from './analytics.service';
export type { DashboardSummary } from './dashboard.service';
export type {
  AdminProduct,
  AdminVariantCombinationInput,
  AdminVariantImageInput,
  AdminVariantTypeInput,
  CreateProductRequest,
  ProductFilters,
  ProductsResponse,
  UpdateProductRequest,
} from './product.service';
export type { AdminOrder, UpdateOrderStatusRequest, UpdateOrderTrackingRequest, ProcessRefundRequest, RejectRefundRequest, OrderFilters, AdminOrderMetrics } from './order.service';
export type { AdminUser, UserActivityLog, UserMetrics, UserFilters, UpdateUserRoleRequest, UpdateUserStatusRequest } from './user.service';
export type { PromoCode, PromoListResult, PromoListFilters, CreatePromoInput, UpdatePromoInput } from './promo.service';
export type {
  AdminCategoryListResult,
  AdminCategoryStats,
  AdminCategoryStatusFilter,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
} from './category.service';

// ─── Re-export all domain services ───────────────────────────────────────────
export { analyticsService } from './analytics.service';
export { dashboardService } from './dashboard.service';
export { adminProductService } from './product.service';
export { adminOrderService } from './order.service';
export { adminUserService } from './user.service';
export { adminPromoService } from './promo.service';
export { adminCategoryService } from './category.service';

// ─── Legacy unified adminService ─────────────────────────────────────────────
// Kept for backward compatibility — components using adminService.X continue
// to work without any changes. Prefer importing the specific service directly
// in new code (e.g. adminOrderService, adminProductService).
import { analyticsService } from './analytics.service';
import { dashboardService } from './dashboard.service';
import { adminProductService } from './product.service';
import { adminOrderService } from './order.service';
import { adminUserService } from './user.service';
import { adminCategoryService } from './category.service';

export const adminService = {
  // Dashboard
  getDashboardSummary: dashboardService.getDashboardSummary.bind(dashboardService),

  // Analytics
  getRevenueMetrics: analyticsService.getRevenueMetrics.bind(analyticsService),
  getOrderAnalytics: analyticsService.getOrderAnalytics.bind(analyticsService),
  getCustomerAnalytics: analyticsService.getCustomerAnalytics.bind(analyticsService),
  getRevenueTrends: analyticsService.getRevenueTrends.bind(analyticsService),
  getProductPerformance: analyticsService.getProductPerformance.bind(analyticsService),

  // Products
  getProducts: adminProductService.getProducts.bind(adminProductService),
  getProduct: adminProductService.getProduct.bind(adminProductService),
  createProduct: adminProductService.createProduct.bind(adminProductService),
  updateProduct: adminProductService.updateProduct.bind(adminProductService),
  deleteProduct: adminProductService.deleteProduct.bind(adminProductService),
  uploadProductImage: adminProductService.uploadProductImage.bind(adminProductService),
  bulkDeleteProducts: adminProductService.bulkDeleteProducts.bind(adminProductService),
  bulkUpdateStock: adminProductService.bulkUpdateStock.bind(adminProductService),

  // Orders
  getOrders: adminOrderService.getOrders.bind(adminOrderService),
  getOrder: adminOrderService.getOrder.bind(adminOrderService),
  updateOrderStatus: adminOrderService.updateOrderStatus.bind(adminOrderService),
  updateOrderTracking: adminOrderService.updateOrderTracking.bind(adminOrderService),
  processRefund: adminOrderService.processRefund.bind(adminOrderService),
  rejectRefund: adminOrderService.rejectRefund.bind(adminOrderService),
  getOrderMetrics: adminOrderService.getOrderMetrics.bind(adminOrderService),

  // Users
  getUsers: adminUserService.getUsers.bind(adminUserService),
  getUser: adminUserService.getUser.bind(adminUserService),
  updateUserRole: adminUserService.updateUserRole.bind(adminUserService),
  updateUserStatus: adminUserService.updateUserStatus.bind(adminUserService),
  disableUser: adminUserService.disableUser.bind(adminUserService),
  enableUser: adminUserService.enableUser.bind(adminUserService),
  getUserActivityLog: adminUserService.getUserActivityLog.bind(adminUserService),
  getUserActivity: adminUserService.getUserActivity.bind(adminUserService),
  getUserMetrics: adminUserService.getUserMetrics.bind(adminUserService),

  // Categories
  listCategories: adminCategoryService.listCategories.bind(adminCategoryService),
  createCategory: adminCategoryService.createCategory.bind(adminCategoryService),
  updateCategory: adminCategoryService.updateCategory.bind(adminCategoryService),
  deleteCategory: adminCategoryService.deleteCategory.bind(adminCategoryService),
};

// Legacy alias — promoAdminService was the old name in admin.ts
export { adminPromoService as promoAdminService } from './promo.service';

// UserActivity type re-export (was exported from old admin.ts — used by activity-timeline.tsx)
export type { UserActivityLog as UserActivity } from './user.service';
