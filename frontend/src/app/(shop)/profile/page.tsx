'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSidebar, ProfileTab } from '@/components/profile/ProfileSidebar';
import { ProfileTab as ProfileTabContent } from '@/components/profile/ProfileTab';
import { AddressesTab } from '@/components/profile/AddressesTab';
import { SecurityTab } from '@/components/profile/SecurityTab';
import { NotificationsTab } from '@/components/profile/NotificationsTab';
import { useProfileData } from '@/hooks/useProfileData';
import { useProfileEdit } from '@/hooks/useProfileEdit';
import { useAddresses } from '@/hooks/useAddresses';
import { useSecurity } from '@/hooks/useSecurity';
import { useProfileNotifications } from '@/hooks/useProfileNotifications';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  // Data hooks
  const { userData, addresses, isLoading, setUserData } = useProfileData();
  const { isEditing, formData, handleEditStart, handleEditCancel, handleFormChange, handleSaveProfile } =
    useProfileEdit(userData ? { name: userData.name, phone: userData.phone } : { name: '', phone: '' });
  const { addresses: managedAddresses, isLoading: addressLoading, ...addressHandlers } =
    useAddresses(addresses);
  const { isLoading: securityLoading, ...securityHandlers } = useSecurity();
  const profileNotifications = useProfileNotifications(activeTab === 'notifications');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login?redirect=/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle profile save
  const handleSave = async () => {
    const result = await handleSaveProfile();
    if (result) {
      setUserData(result);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-48 w-full mb-6" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <ProfileHeader
        name={userData.name}
        email={userData.email}
        createdAt={userData.created_at}
        isLoading={isLoading}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <ProfileSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={() => {
              // Logout is handled in ProfileSidebar using useAuthStore
            }}
          />

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <ProfileTabContent
                  key="profile"
                  userName={userData.name}
                  userEmail={userData.email}
                  userPhone={userData.phone}
                  isEditing={isEditing}
                  formData={formData}
                  onEditClick={handleEditStart}
                  onCancelClick={handleEditCancel}
                  onSaveClick={handleSave}
                  onFormChange={handleFormChange}
                />
              )}

              {activeTab === 'addresses' && (
                <AddressesTab
                  key="addresses"
                  addresses={managedAddresses}
                  isLoading={addressLoading}
                  onAddAddress={addressHandlers.handleAddAddress}
                  onEditAddress={addressHandlers.handleEditAddress}
                  onDeleteAddress={addressHandlers.handleDeleteAddress}
                  onSetDefault={addressHandlers.handleSetDefault}
                />
              )}

              {activeTab === 'security' && (
                <SecurityTab
                  key="security"
                  email={userData.email}
                  onPasswordResetRequest={securityHandlers.handlePasswordResetRequest}
                  onDeleteAccount={securityHandlers.handleDeleteAccount}
                  isLoading={securityLoading}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsTab
                  key="notifications"
                  history={profileNotifications.notifications}
                  isHistoryLoading={profileNotifications.isLoading}
                  historyPage={profileNotifications.page}
                  historyTotalPages={profileNotifications.totalPages}
                  historyTotal={profileNotifications.total}
                  canGoPrevious={profileNotifications.canGoPrevious}
                  canGoNext={profileNotifications.canGoNext}
                  onHistoryPageChange={(page) => void profileNotifications.loadPage(page)}
                  onOpenNotification={(notification) => void profileNotifications.openNotification(notification)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
