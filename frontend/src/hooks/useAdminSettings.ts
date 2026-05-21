import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { handleError } from '@/utils/error-handler';

export interface SettingsState {
  store: {
    name: string;
    email: string;
    phone: string;
    address: string;
    currency: string;
    logo: string;
  };
  notifications: {
    newOrder: boolean;
    lowStock: boolean;
    newUser: boolean;
    payment: boolean;
    email: boolean;
    lowStockThreshold: string;
  };
  security: {
    sessionTimeout: string;
    maxLoginAttempts: string;
    requireEmailVerif: boolean;
    twoFactorAdmin: boolean;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    logLevel: string;
    itemsPerPage: string;
  };
  appearance: {
    defaultTheme: 'light' | 'dark' | 'system';
    itemsPerPage: string;
  };
}

const defaultSettings: SettingsState = {
  store: {
    name: 'Daarn Store',
    email: 'hello@daarn.store',
    phone: '+62 812 3456 7890',
    address: 'Jakarta, Indonesia',
    currency: 'IDR',
    logo: '',
  },
  notifications: {
    newOrder: true,
    lowStock: true,
    newUser: false,
    payment: true,
    email: true,
    lowStockThreshold: '10',
  },
  security: {
    sessionTimeout: '60',
    maxLoginAttempts: '5',
    requireEmailVerif: true,
    twoFactorAdmin: false,
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
    logLevel: 'info',
    itemsPerPage: '20',
  },
  appearance: {
    defaultTheme: 'system',
    itemsPerPage: '20',
  },
};

interface UseAdminSettingsReturn {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState, T extends keyof SettingsState[K]>(
    section: K,
    key: T,
    value: SettingsState[K][T]
  ) => void;
  isSaving: boolean;
  saved: boolean;
  handleSave: () => Promise<void>;
}

export function useAdminSettings(): UseAdminSettingsReturn {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof SettingsState, T extends keyof SettingsState[K]>(
      section: K,
      key: T,
      value: SettingsState[K][T]
    ): void => {
      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      setIsSaving(true);
      // NOTE: Backend Settings API tidak ada — ini simulasi.
      // Ketika backend Settings handler siap, panggil:
      //   await api.put('/admin/settings', settings)
      await new Promise((r) => setTimeout(r, 800));
      setSaved(true);
      toast.success('Pengaturan berhasil disimpan');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleError(error, { context: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    settings,
    updateSetting,
    isSaving,
    saved,
    handleSave,
  };
}
