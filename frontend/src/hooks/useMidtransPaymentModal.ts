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

export function useMidtransPaymentModal() {
  const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  // Load Snap.js script
  useEffect(() => {
    if (!snapUrl || !clientKey) return;
    if (document.querySelector(`script[src="${snapUrl}"]`)) return;

    const loadScript = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = snapUrl;
        s.setAttribute('data-client-key', clientKey);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Midtrans Snap'));
        document.body.appendChild(s);
      });
    };

    loadScript().catch((err) => console.error('Failed to load Midtrans:', err));
  }, [snapUrl, clientKey]);

  const pay = (
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

  return { pay };
}
