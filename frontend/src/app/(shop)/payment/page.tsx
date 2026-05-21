'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import { PaymentLoading } from '@/components/shop/PaymentLoading';
import { PaymentError } from '@/components/shop/PaymentError';
import { PaymentSuccess } from '@/components/shop/PaymentSuccess';
import { PaymentForm } from '@/components/shop/PaymentForm';

function PaymentPageContent() {
  const { orderId, state, setLoading, handlePaymentSuccess, handlePaymentError } =
    usePaymentFlow();

  // Show loading state
  if (state.isLoading && !state.order) {
    return <PaymentLoading />;
  }

  // Show error state
  if (state.error) {
    return <PaymentError error={state.error} />;
  }

  // Show success state
  if (state.paymentStatus === 'settlement') {
    return <PaymentSuccess />;
  }

  // Show payment form
  if (state.order?.payment_url) {
    return (
      <PaymentForm
        orderId={orderId || ''}
        snapToken={state.order.payment_url}
        isLoading={state.isLoading}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        onLoadingChange={setLoading}
      />
    );
  }

  return <PaymentError error="Payment unavailable" />;
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
