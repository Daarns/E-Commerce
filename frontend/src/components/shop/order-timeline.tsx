'use client';

import {
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from '@/constants/order.constants';
import { Order, OrderStatus } from '@/types';
import { Check, Clock, Info, Truck } from 'lucide-react';

interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  date: string;
  description?: string;
}

function getOrderTimelineEvents(order: Order): OrderTimelineEvent[] {
  const currentStatus = order.status || order.order_status;
  const historyByStatus = new Map(
    (order.status_history ?? []).map((history) => [history.to_status, history.changed_at])
  );

  if (currentStatus === 'cancelled') {
    return [{
      status: 'cancelled',
      label: ORDER_STATUS_LABELS.cancelled,
      date: new Date(historyByStatus.get('cancelled') || order.cancelled_at || order.updated_at).toLocaleString('id-ID'),
      description: ORDER_STATUS_DESCRIPTIONS.cancelled,
    }];
  }

  const timelineBaseStatus: OrderStatus =
    currentStatus === 'refund_requested' || currentStatus === 'refund_rejected' || currentStatus === 'refunded'
      ? 'completed'
      : currentStatus;
  const currentIndex = ORDER_STATUS_FLOW.indexOf(timelineBaseStatus);
  const visibleStatuses = currentIndex >= 0
    ? ORDER_STATUS_FLOW.slice(0, currentIndex + 1)
    : ORDER_STATUS_FLOW.slice(0, 1);

  const normalEvents = visibleStatuses.map(status => {
    const historyDate = historyByStatus.get(status);
    const fallbackDate = status === 'pending' ? order.created_at : status === currentStatus ? order.updated_at : '';

    return {
      status,
      label: ORDER_STATUS_LABELS[status],
      date: historyDate || fallbackDate
        ? new Date(historyDate || fallbackDate).toLocaleString('id-ID')
        : '',
      description: ORDER_STATUS_DESCRIPTIONS[status],
    };
  });

  const refundStatuses: OrderStatus[] = ['refund_requested', 'refund_rejected', 'refunded'];
  const refundEvents = refundStatuses
    .filter((status) => currentStatus === status || historyByStatus.has(status) || (status === 'refunded' && order.payment_status === 'refunded'))
    .map((status) => ({
      status,
      label: ORDER_STATUS_LABELS[status],
      date: new Date(historyByStatus.get(status) || order.updated_at).toLocaleString('id-ID'),
      description: ORDER_STATUS_DESCRIPTIONS[status],
    }));

  return [...normalEvents, ...refundEvents];
}

export function OrderTimeline({ order }: { order: Order }) {
  const events = getOrderTimelineEvents(order);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-6">Order Status</h3>
      
      <div className="space-y-4">
        {events.map((event, index) => {
          const isCompleted = true;
          const isCurrent = index === events.length - 1;
          
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
                
                {event.description && (
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.tracking_number && (
        <div className="mt-6 pt-6 border-t">
          <div className="mb-2 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-700" />
            <h4 className="font-medium text-sm">Tracking Number</h4>
          </div>
          <p className="text-gray-700 font-mono bg-gray-50 p-3 rounded break-all">
            {order.tracking_number}
          </p>
          <div className="mt-3 flex gap-2 rounded-md border bg-blue-50 p-3 text-xs text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Tracking is updated manually by the store. Use this number on the courier website if you need live shipment details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
