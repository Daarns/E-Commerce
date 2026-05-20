import { useCallback, useEffect, useState } from 'react';

type MidtransSnapWindow = Window & {
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
};

export type PaymentCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};

/**
 * Hook that loads the Midtrans Snap.js script and exposes openPaymentPopup.
 *
 * Improvements over the previous version:
 * - Uses the sandbox Snap URL as a non-secret fallback.
 * - Returns false when Snap.js is unavailable so callers can use redirect_url.
 */
export function useMidtransPayment(): {
  openPaymentPopup: (token: string, callbacks: PaymentCallbacks) => boolean;
  isSnapReady: boolean;
  snapLoadError: string | null;
} {
  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ??
    'https://app.sandbox.midtrans.com/snap/snap.js';
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const [isSnapReady, setIsSnapReady] = useState<boolean>(false);
  const [snapLoadError, setSnapLoadError] = useState<string | null>(
    clientKey ? null : 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is not configured'
  );

  useEffect(() => {
    if (!clientKey) {
      return;
    }

    if ((window as unknown as MidtransSnapWindow).snap) {
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${snapUrl}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = snapUrl;
      script.setAttribute('data-client-key', clientKey);
      script.async = true;
      document.head.appendChild(script);
    } else if (!script.getAttribute('data-client-key')) {
      script.setAttribute('data-client-key', clientKey);
    }

    const handleLoad = (): void => {
      const snap = (window as unknown as MidtransSnapWindow).snap;
      setIsSnapReady(Boolean(snap));
      setSnapLoadError(snap ? null : 'Midtrans Snap loaded but is not available');
    };
    const handleError = (): void => {
      setIsSnapReady(false);
      setSnapLoadError('Failed to load Midtrans Snap');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    return () => {
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, [snapUrl, clientKey]);

  const openPaymentPopup = useCallback(
    (token: string, callbacks: PaymentCallbacks): boolean => {
      if (!token.trim()) return false;

      const snap = (window as unknown as MidtransSnapWindow).snap;
      if (!snap) {
        setSnapLoadError('Midtrans Snap is not ready');
        return false;
      }

      try {
        snap.pay(token, callbacks);
        return true;
      } catch {
        setSnapLoadError('Failed to open Midtrans Snap');
        return false;
      }
    },
    []
  );

  const snapAvailable = typeof window !== 'undefined' && Boolean((window as unknown as MidtransSnapWindow).snap);

  return { openPaymentPopup, isSnapReady: isSnapReady || snapAvailable, snapLoadError };
}
