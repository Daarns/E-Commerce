import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PaymentErrorPageContent } from '@/components/shop/payment-error-page-content';

export default function PaymentErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentErrorPageContent />
    </Suspense>
  );
}
