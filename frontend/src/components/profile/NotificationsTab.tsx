'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface NotificationsTabProps {
  notifications: {
    email_orders: boolean;
    email_promotions: boolean;
    push_orders: boolean;
    push_promotions: boolean;
  };
  onToggle: (key: keyof NotificationsTabProps['notifications'], value: boolean) => void;
}

const EMAIL_OPTIONS = [
  { key: 'email_orders', label: 'Order Updates', desc: 'Get notified about your order status' },
  {
    key: 'email_promotions',
    label: 'Promotions',
    desc: 'Receive promotional offers and discounts',
  },
];

const PUSH_OPTIONS = [
  { key: 'push_orders', label: 'Order Updates', desc: 'Instant notifications for order changes' },
  { key: 'push_promotions', label: 'Flash Sales', desc: 'Be first to know about limited deals' },
];

export function NotificationsTab({ notifications, onToggle }: NotificationsTabProps) {
  const renderToggle = (
    enabled: boolean,
    onChange: (value: boolean) => void
  ) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Manage what emails you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EMAIL_OPTIONS.map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                {renderToggle(
                  notifications[item.key as keyof typeof notifications],
                  (value) =>
                    onToggle(item.key as keyof typeof notifications, value)
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>Control in-app notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PUSH_OPTIONS.map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                {renderToggle(
                  notifications[item.key as keyof typeof notifications],
                  (value) =>
                    onToggle(item.key as keyof typeof notifications, value)
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
