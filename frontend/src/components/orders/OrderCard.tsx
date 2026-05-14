'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, CreditCard, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ORDER_STATUS_LABELS,
  SHOP_ORDER_STATUS_BADGE_COLORS,
} from '@/constants/order.constants';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { toNum, formatCurrency, formatDate } from '@/utils';
import { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  index: number;
  isPayingOrder: boolean;
  isSyncingOrder: boolean;
  isCancelling: boolean;
  onViewDetails: (order: Order) => void;
  onPay: (order: Order) => void;
  onSync: (order: Order) => void;
  onCancel: (orderId: string) => void;
}

export function OrderCard({
  order,
  index,
  isPayingOrder,
  isSyncingOrder,
  isCancelling,
  onViewDetails,
  onPay,
  onSync,
  onCancel,
}: OrderCardProps) {
  const statusLabel = order.order_status === 'pending'
    ? 'Pending Payment'
    : ORDER_STATUS_LABELS[order.order_status];
  const statusColor = SHOP_ORDER_STATUS_BADGE_COLORS[order.order_status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{order.order_number}</h3>
                <Badge className={statusColor}>
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">
                {formatCurrency(toNum(order.total))}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Items Preview */}
          <div className="flex flex-wrap gap-4 mb-4">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={PLACEHOLDER_PRODUCT_IMAGE}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm line-clamp-1">
                    {item.product_name}
                  </p>
                  {(item.variant_type || item.variant_value) && (
                    <p className="text-xs text-muted-foreground">
                      {item.variant_type}: {item.variant_value}
                    </p>
                  )}
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
          {order.tracking_number && order.order_status === 'shipped' && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-medium">Tracking:</span>
                <span className="text-muted-foreground">
                  {order.tracking_number}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails(order)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>

            <div className="flex gap-2 flex-wrap">
              {order.order_status === 'pending' && order.payment_status === 'unpaid' && (
                <Button
                  size="sm"
                  onClick={() => onPay(order)}
                  disabled={isPayingOrder}
                  className="gap-1"
                >
                  <CreditCard className="h-3 w-3" />
                  {isPayingOrder ? 'Memuat...' : 'Lanjutkan Pembayaran'}
                </Button>
              )}
              {order.order_status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSync(order)}
                  disabled={isSyncingOrder}
                  className="gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncingOrder ? 'animate-spin' : ''}`} />
                  {isSyncingOrder ? 'Mengecek...' : 'Cek Status'}
                </Button>
              )}
              {order.order_status === 'pending' && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isCancelling}
                  onClick={() => onCancel(order.id)}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              )}
              {order.order_status === 'delivered' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/products">Buy Again</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
