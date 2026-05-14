'use client';

import { motion } from 'framer-motion';
import { Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMidtransPaymentModal } from '@/hooks/useMidtransPaymentModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PaymentFormProps {
  orderId: string;
  snapToken: string;
  isLoading: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function PaymentForm({
  orderId,
  snapToken,
  isLoading,
  onSuccess,
  onError,
  onLoadingChange,
}: PaymentFormProps) {
  const router = useRouter();
  const { pay } = useMidtransPaymentModal();

  const handlePayment = async () => {
    if (!snapToken) return;

    onLoadingChange(true);
    const success = pay(snapToken, {
      onSuccess: () => {
        onLoadingChange(false);
        onSuccess();
      },
      onPending: () => {
        console.log('Payment pending');
      },
      onError: () => {
        onLoadingChange(false);
        onError('Payment failed');
      },
      onClose: () => {
        onLoadingChange(false);
      },
    });

    if (!success) {
      onLoadingChange(false);
      onError('Failed to open payment gateway');
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
          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2"
          >
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
                You&apos;ll be redirected to Midtrans secure payment page to complete your transaction.
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
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
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
                disabled={isLoading}
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
                Click &quot;Proceed to Payment&quot; to be taken to Midtrans secure payment gateway where you can choose your preferred payment method.
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
