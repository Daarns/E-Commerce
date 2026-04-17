'use client';

import { Order, OrderStatus } from '@/types';
import { Check, Clock } from 'lucide-react';

interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  date: string;
  description?: string;
}

function getOrderTimelineEvents(order: Order): OrderTimelineEvent[] {
  const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  
  return statusOrder.map(status => {
    const isCompleted = statusOrder.indexOf(status) <= statusOrder.indexOf(order.status);
    const isCurrent = status === order.status;
    
    return {
      status,
      label: formatStatusLabel(status),
      date: status === order.status ? new Date(order.updated_at).toLocaleString('id-ID') : '',
      description: getStatusDescription(status),
    };
  });
}

function formatStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Order Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return labels[status];
}

function getStatusDescription(status: OrderStatus): string {
  const descriptions: Record<OrderStatus, string> = {
    pending: 'Order placed and waiting for confirmation',
    confirmed: 'Order confirmed and being prepared',
    processing: 'Items are being packed',
    shipped: 'Package is on the way',
    delivered: 'Package delivered',
    cancelled: 'Order has been cancelled',
    refunded: 'Order refunded',
  };
  return descriptions[status];
}

export function OrderTimeline({ order }: { order: Order }) {
  const events = getOrderTimelineEvents(order);
  const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as OrderStatus[];
  const currentIndex = statusOrder.indexOf(order.status);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-6">Order Status</h3>
      
      <div className="space-y-4">
        {events.map((event, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={event.status} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                
                {/* Connector line */}
                {index < events.length - 1 && (
                  <div className={`w-0.5 h-16 mt-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              
              {/* Content */}
              <div className="pt-1 pb-4">
                <h4 className={`font-medium ${
                  isCurrent ? 'text-green-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {event.label}
                </h4>
                
                {event.date && (
                  <p className="text-sm text-gray-500 mt-1">{event.date}</p>
                )}
                
                {event.description && !isCurrent && (
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.tracking_number && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium text-sm mb-2">Tracking Number</h4>
          <p className="text-gray-700 font-mono bg-gray-50 p-3 rounded">
            {order.tracking_number}
          </p>
        </div>
      )}
    </div>
  );
}
