'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Search,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order, OrderStatus } from '@/types';

// Mock orders for demo
const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2025-001',
    order_number: 'ORD-2025-001',
    user_id: '1',
    status: 'delivered',
    total_amount: 1250000,
    subtotal: 1200000,
    shipping_cost: 50000,
    discount_amount: 0,
    tax_amount: 0,
    shipping_address: {
      id: '1',
      recipient_name: 'John Doe',
      phone: '+62 812 3456 7890',
      street_address: 'Jl. Sudirman No. 123',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postal_code: '12190',
      country: 'Indonesia',
      is_default: true,
    },
    payment_method: 'bank-transfer',
    payment_status: 'paid',
    items: [
      {
        id: '1',
        product_id: '1',
        product_name: 'Premium Leather Bag',
        product_image: '/placeholder-product.jpg',
        quantity: 1,
        unit_price: 800000,
        total_price: 800000,
      },
      {
        id: '2',
        product_id: '2',
        product_name: 'Classic Watch',
        product_image: '/placeholder-product.jpg',
        quantity: 1,
        unit_price: 400000,
        total_price: 400000,
      },
    ],
    tracking_number: 'JNE-12345678',
    created_at: '2025-03-28T10:00:00Z',
    updated_at: '2025-03-30T15:00:00Z',
  },
  {
    id: 'ORD-2025-002',
    order_number: 'ORD-2025-002',
    user_id: '1',
    status: 'shipped',
    total_amount: 750000,
    subtotal: 700000,
    shipping_cost: 50000,
    discount_amount: 0,
    tax_amount: 0,
    shipping_address: {
      id: '1',
      recipient_name: 'John Doe',
      phone: '+62 812 3456 7890',
      street_address: 'Jl. Sudirman No. 123',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postal_code: '12190',
      country: 'Indonesia',
      is_default: true,
    },
    payment_method: 'e-wallet',
    payment_status: 'paid',
    items: [
      {
        id: '3',
        product_id: '3',
        product_name: 'Wireless Earbuds Pro',
        product_image: '/placeholder-product.jpg',
        quantity: 2,
        unit_price: 350000,
        total_price: 700000,
      },
    ],
    tracking_number: 'JNT-87654321',
    created_at: '2025-04-01T14:30:00Z',
    updated_at: '2025-04-02T09:00:00Z',
  },
  {
    id: 'ORD-2025-003',
    order_number: 'ORD-2025-003',
    user_id: '1',
    status: 'processing',
    total_amount: 2500000,
    subtotal: 2450000,
    shipping_cost: 50000,
    discount_amount: 0,
    tax_amount: 0,
    shipping_address: {
      id: '2',
      recipient_name: 'John Doe',
      phone: '+62 812 3456 7890',
      street_address: 'Menara BCA, Lt. 25',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postal_code: '10310',
      country: 'Indonesia',
      is_default: false,
    },
    payment_method: 'credit-card',
    payment_status: 'paid',
    items: [
      {
        id: '4',
        product_id: '4',
        product_name: 'Smart Watch Series 5',
        product_image: '/placeholder-product.jpg',
        quantity: 1,
        unit_price: 2450000,
        total_price: 2450000,
      },
    ],
    created_at: '2025-04-03T08:00:00Z',
    updated_at: '2025-04-03T08:00:00Z',
  },
  {
    id: 'ORD-2025-004',
    order_number: 'ORD-2025-004',
    user_id: '1',
    status: 'pending',
    total_amount: 450000,
    subtotal: 400000,
    shipping_cost: 50000,
    discount_amount: 0,
    tax_amount: 0,
    shipping_address: {
      id: '1',
      recipient_name: 'John Doe',
      phone: '+62 812 3456 7890',
      street_address: 'Jl. Sudirman No. 123',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postal_code: '12190',
      country: 'Indonesia',
      is_default: true,
    },
    payment_method: 'bank-transfer',
    payment_status: 'pending',
    items: [
      {
        id: '5',
        product_id: '5',
        product_name: 'Cotton T-Shirt',
        product_image: '/placeholder-product.jpg',
        quantity: 2,
        unit_price: 200000,
        total_price: 400000,
      },
    ],
    created_at: '2025-04-04T16:00:00Z',
    updated_at: '2025-04-04T16:00:00Z',
  },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending Payment',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <Package className="h-4 w-4" />,
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: <Truck className="h-4 w-4" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <XCircle className="h-4 w-4" />,
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: <XCircle className="h-4 w-4" />,
  },
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Check for success param
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  }, [searchParams]);

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrders(MOCK_ORDERS);
      setFilteredOrders(MOCK_ORDERS);
      setIsLoading(false);
    }
    
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // Filter orders
  useEffect(() => {
    let result = [...orders];
    
    if (searchQuery) {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => 
          item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(result);
  }, [orders, searchQuery, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Login</h1>
        <p className="text-muted-foreground mb-8">
          You need to login to view your orders.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/orders">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/50 dark:border-green-800">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Order placed successfully!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No orders found</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : "You haven't placed any orders yet"}
              </p>
              <Button asChild>
                <Link href="/products">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const statusConfig = STATUS_CONFIG[order.status];
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{order.id}</h3>
                            <Badge className={statusConfig.color}>
                              <span className="mr-1">{statusConfig.icon}</span>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Placed on {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Order Items Preview */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={item.product_image || '/placeholder-product.jpg'}
                                alt={item.product_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">
                                {item.product_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground">
                              +{order.items.length - 3} more
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tracking Info */}
                      {order.tracking_number && order.status === 'shipped' && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="font-medium">Tracking:</span>
                            <span className="text-muted-foreground">{order.tracking_number}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        
                        {order.status === 'pending' && (
                          <Button size="sm">Pay Now</Button>
                        )}
                        
                        {order.status === 'delivered' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/products/${order.items[0]?.product_id}`}>
                              Buy Again
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Order {selectedOrder.id}
                    <Badge className={STATUS_CONFIG[selectedOrder.status].color}>
                      {STATUS_CONFIG[selectedOrder.status].label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Order Timeline */}
                  <div>
                    <h4 className="font-medium mb-3">Order Status</h4>
                    <div className="flex items-center justify-between">
                      {(['pending', 'processing', 'shipped', 'delivered'] as const).map((status, index) => {
                        const statusIndex = ['pending', 'processing', 'shipped', 'delivered'].indexOf(selectedOrder.status);
                        const isActive = statusIndex >= index;
                        const isCurrent = selectedOrder.status === status;
                        
                        return (
                          <div key={status} className="flex items-center">
                            <div className={`flex flex-col items-center ${index > 0 ? 'ml-4' : ''}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {STATUS_CONFIG[status].icon}
                              </div>
                              <span className={`text-xs mt-1 ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                                {STATUS_CONFIG[status].label}
                              </span>
                            </div>
                            {index < 3 && (
                              <div className={`w-16 h-0.5 mx-2 ${isActive ? 'bg-primary' : 'bg-muted'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-3">Items</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={item.product_image || '/placeholder-product.jpg'}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.unit_price)} x {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium">{formatCurrency(item.total_price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-3">Shipping Address</h4>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{selectedOrder.shipping_address.recipient_name}</p>
                      <p>{selectedOrder.shipping_address.phone}</p>
                      <p>{selectedOrder.shipping_address.street_address}</p>
                      <p>
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province} {selectedOrder.shipping_address.postal_code}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Summary */}
                  <div>
                    <h4 className="font-medium mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatCurrency(selectedOrder.shipping_cost)}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-base">
                        <span>Total</span>
                        <span>{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    {selectedOrder.status === 'pending' && (
                      <Button className="flex-1">Pay Now</Button>
                    )}
                    {selectedOrder.tracking_number && (
                      <Button variant="outline" className="flex-1">Track Package</Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
