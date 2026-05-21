/**
 * Payment Service - Midtrans Integration
 * Handles payment processing and Snap integration
 */

interface MidtransSnapResult {
  order_id?: string;
  status_code?: string;
  transaction_status?: string;
  payment_type?: string;
}

interface MidtransSnapCallbacks {
  onSuccess: (result: MidtransSnapResult) => void;
  onPending: (result: MidtransSnapResult) => void;
  onError: (result: MidtransSnapResult) => void;
  onClose: () => void;
}

interface MidtransSnap {
  pay: (snapToken: string, callbacks: MidtransSnapCallbacks) => void;
}

// Load Midtrans Snap script
export const loadMidtransSnap = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const snapWindow = window as Window & { snap?: MidtransSnap };
    if (snapWindow.snap) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.async = true;
    script.onload = () => {
      if (snapWindow.snap) {
        resolve();
      } else {
        reject(new Error('Failed to load Midtrans Snap'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Midtrans Snap script'));
    };
    document.head.appendChild(script);
  });
};

// Payment types
export interface PaymentRequest {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

// Open Midtrans Snap payment
export const openPayment = (snapToken: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const snap = (window as Window & { snap?: MidtransSnap }).snap;
    if (!snap) {
      reject(new Error('Midtrans Snap not loaded'));
      return;
    }

    snap.pay(snapToken, {
      onSuccess: () => {
        resolve();
      },
      onPending: (result) => {
        console.log('Payment pending:', result);
      },
      onError: () => {
        reject(new Error('Payment failed'));
      },
      onClose: () => {
        reject(new Error('Payment cancelled'));
      },
    });
  });
};

// Get payment method display info
export const PAYMENT_METHODS = [
  {
    id: 'bank-transfer',
    name: 'Bank Transfer',
    description: 'BCA, Mandiri, BNI, BRI, Permata',
    icon: '🏦',
  },
  {
    id: 'e-wallet',
    name: 'E-Wallet',
    description: 'GoPay, OVO, DANA, ShopeePay, LinkAja',
    icon: '📱',
  },
  {
    id: 'credit-card',
    name: 'Credit Card',
    description: 'Visa, Mastercard, JCB, American Express',
    icon: '💳',
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay when package arrives',
    icon: '🚚',
  },
];

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SETTLEMENT = 'settlement',
  EXPIRED = 'expired',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Payment status display
export const getPaymentStatusDisplay = (
  status: PaymentStatus
): { label: string; color: string } => {
  const statusMap = {
    [PaymentStatus.PENDING]: { label: 'Pending', color: 'bg-yellow-500' },
    [PaymentStatus.PROCESSING]: { label: 'Processing', color: 'bg-blue-500' },
    [PaymentStatus.SETTLEMENT]: { label: 'Settled', color: 'bg-green-500' },
    [PaymentStatus.EXPIRED]: { label: 'Expired', color: 'bg-red-500' },
    [PaymentStatus.FAILED]: { label: 'Failed', color: 'bg-red-500' },
    [PaymentStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-gray-500' },
  };

  return statusMap[status] || { label: 'Unknown', color: 'bg-gray-400' };
};
