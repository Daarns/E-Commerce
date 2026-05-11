'use client';

import { useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  Shield,
  Bell,
  Heart,
  Package,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export type ProfileTab = 'profile' | 'addresses' | 'security' | 'notifications';

interface ProfileSidebarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onLogout: () => void;
}

const TABS: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

export function ProfileSidebar({
  activeTab,
  onTabChange,
  onLogout,
}: ProfileSidebarProps) {
  const router = useRouter();

  return (
    <div className="lg:w-64 flex-shrink-0">
      <Card className="sticky top-24">
        <CardContent className="p-2">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}

            <Separator className="my-4" />

            {/* Quick Links */}
            <button
              onClick={() => router.push('/orders')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Package className="h-4 w-4" />
                <span>My Orders</span>
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => router.push('/wishlist')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Heart className="h-4 w-4" />
                <span>Wishlist</span>
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <Separator className="my-4" />

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
