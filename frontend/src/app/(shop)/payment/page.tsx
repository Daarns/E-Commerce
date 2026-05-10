'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { orderService } from '@/services/order';
import { loadMidtransSnap, openPayment, getPaymentStatusDisplay } from '@/services/payment';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface PaymentPageState {
  isLoading: boolean;
  snapToken?: string;
  paymentStatus?: string;
  error?: string;
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const orderId = searchParams.get('order_id');
  const [state, setState] = useState<PaymentPageState>({
    isLoading: true,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!orderId) {
      router.push('/cart');
      return;
    }

    const fetchOrder = async () => {
      try {
        const order = await orderService.getOrder(orderId);

        // Check if order already has a payment_url
        if (order.payment_url) {
          setState(prev => ({
            ...prev,
            snapToken: order.payment_url,
            isLoading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            error: 'No payment token available',
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to load payment information',
          isLoading: false,
        }));
        toast.error('Failed to load payment information');
      }
    };

    fetchOrder();
  }, [orderId, user, router]);

  useEffect(() => {
    if (state.snapToken) {
      loadMidtransSnap().catch(error => {
        console.error('Failed to load Midtrans:', error);
        toast.error('Failed to load payment gateway');
      });
    }
  }, [state.snapToken]);

  const handlePayment = async () => {
    if (!state.snapToken) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await openPayment(state.snapToken);

      // Payment successful
      setState(prev => ({
        ...prev,
        paymentStatus: 'settlement',
        isLoading: false,
      }));

      toast.success('Payment successful!');

      // Redirect to order confirmation after 2 seconds
      setTimeout(() => {
        router.push(`/orders/${orderId}`);
      }, 2000);
    } catch (error) {
      console.error('Payment failed:', error);
      setState(prev => ({
        ...prev,
        paymentStatus: 'failed',
        isLoading: false,
      }));
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  if (state.isLoading && !state.snapToken) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading payment gateway...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (state.error) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-center font-semibold">Payment Error</p>
              <p className="text-center text-muted-foreground">{state.error}</p>
              <Button
                onClick={() => router.push('/cart')}
                className="w-full mt-4"
              >
                Back to Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (state.paymentStatus === 'settlement') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"
      >
        <Card className="w-full max-w-md border-green-200">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="h-12 w-12 text-green-500" />
              </motion.div>
              <p className="text-center font-semibold text-lg">Payment Successful!</p>
              <p className="text-center text-muted-foreground">
                Your order has been confirmed. Redirecting to order details...
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cart" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2">
            ← Back to Cart
          </Link>
          <h1 className="text-3xl font-bold mt-2">Complete Payment</h1>
          <p className="text-muted-foreground mt-2">
            Order #{orderId?.substring(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Payment Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Payment Method</span>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Waiting for payment
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                📱 Secure Payment Gateway
              </p>
              <p className="text-sm text-blue-800 mt-2">
                You'll be redirected to Midtrans secure payment page to complete your transaction.
              </p>
            </div>

            <Separator />

            {/* Payment Methods */}
            <div>
              <h3 className="font-semibold mb-4">Available Payment Methods</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-sm font-medium">🏦 Bank Transfer</p>
                  <p className="text-xs text-muted-foreground">BCA, Mandiri, BNI, BRI</p>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-sm font-medium">📱 E-Wallet</p>
                  <p className="text-xs text-muted-foreground">GoPay, OVO, DANA</p>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-sm font-medium">💳 Credit Card</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard, JCB</p>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50">
                  <p className="text-sm font-medium">🚚 Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">Pay on arrival</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handlePayment}
                disabled={state.isLoading}
                size="lg"
                className="w-full"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/cart')}
                disabled={state.isLoading}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Security Note */}
            <div className="text-center text-xs text-muted-foreground pt-2">
              🔒 Your payment information is secure and encrypted
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm mb-1">What happens next?</p>
              <p className="text-sm text-muted-foreground">
                Click "Proceed to Payment" to be taken to Midtrans secure payment gateway where you can choose your preferred payment method.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm mb-1">Is my payment safe?</p>
              <p className="text-sm text-muted-foreground">
                Yes, we use Midtrans which is a certified PCI DSS Level 1 compliant payment processor. Your information is fully encrypted.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm mb-1">What payment methods can I use?</p>
              <p className="text-sm text-muted-foreground">
                We accept bank transfers, e-wallets, credit cards, and cash on delivery. Choose the method that works best for you on the payment gateway.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
