import { PaymentCallbacks, useMidtransPayment } from './useMidtransPayment';

export function useMidtransPaymentModal(): {
  pay: (token: string, callbacks: PaymentCallbacks) => boolean;
  isSnapReady: boolean;
  snapLoadError: string | null;
} {
  const { openPaymentPopup, isSnapReady, snapLoadError } = useMidtransPayment();

  return {
    pay: openPaymentPopup,
    isSnapReady,
    snapLoadError,
  };
}
