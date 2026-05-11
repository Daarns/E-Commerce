import { useEffect } from 'react';

interface MidtransSnapWindow extends Window {
  snap?: {
    pay: (
      token: string,
      callbacks: {
        onSuccess?: () => void;
        onPending?: () => void;
        onError?: () => void;
        onClose?: () => void;
      }
    ) => void;
  };
}

export function useMidtransPayment() {
  const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  useEffect(() => {
    if (!snapUrl || !clientKey) return;
    if (document.querySelector(`script[src="${snapUrl}"]`)) return;

    const script = document.createElement('script');
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.head.appendChild(script);
  }, [snapUrl, clientKey]);

  const openPaymentPopup = (
    token: string,
    callbacks: {
      onSuccess?: () => void;
      onPending?: () => void;
      onError?: () => void;
      onClose?: () => void;
    }
  ): boolean => {
    const snap = (window as unknown as MidtransSnapWindow).snap;
    if (!snap) return false;

    snap.pay(token, callbacks);
    return true;
  };

  return { openPaymentPopup };
}
