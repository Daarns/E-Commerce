import { useState } from 'react';

interface NotificationSettings {
  email_orders: boolean;
  email_promotions: boolean;
  email_newsletter: boolean;
  push_orders: boolean;
  push_promotions: boolean;
}

export function useNotifications(initialSettings: NotificationSettings) {
  const [notifications, setNotifications] = useState<NotificationSettings>(initialSettings);

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return {
    notifications,
    handleToggle,
  };
}
