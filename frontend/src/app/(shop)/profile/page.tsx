'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  User,
  Mail,
  MapPin,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Camera,
  Shield,
  Bell,
  Heart,
  Package,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { Address } from '@/types';
import { authService } from '@/services/auth';
import { userService } from '@/services/user';
import { addressService } from '@/services/address';
import { AvatarSVG } from '@/components/common/avatar';
import { toast } from 'sonner';

// Mock user data
const MOCK_USER = {
  id: '1',
  email: 'john.doe@example.com',
  name: 'John Doe',
  phone: '+62 812 3456 7890',
  created_at: '2024-01-15T10:00:00Z',
};



type ProfileTab = 'profile' | 'addresses' | 'security' | 'notifications';

const TABS: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const headerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(MOCK_USER);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: userData.name,
    phone: userData.phone,
  });

  const [addressForm, setAddressForm] = useState<Partial<Address>>({
    recipient_name: '',
    phone: '',
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    is_default: false,
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_orders: true,
    email_promotions: true,
    email_newsletter: false,
    push_orders: true,
    push_promotions: false,
  });

  // Animation effect
  useEffect(() => {
    if (headerRef.current && !isLoading) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  // Load data
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const [userProfile, userAddresses] = await Promise.all([
          authService.getProfile(),
          addressService.getAddresses(),
        ]);
        setUserData({
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          phone: userProfile.phone || '+62 0000 0000 0000',
          created_at: userProfile.created_at,
        });
        setFormData({
          name: userProfile.name,
          phone: userProfile.phone || '',
        });
        setAddresses(userAddresses);
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login?redirect=/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSaveProfile = async () => {
    try {
      const updatedUser = await userService.updateProfile({
        name: formData.name,
        phone: formData.phone,
      });
      setUserData({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone || '+62 0000 0000 0000',
        created_at: updatedUser.created_at,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setFormData({ name: userData.name, phone: userData.phone });
    setIsEditing(false);
  };

  const resetAddressForm = () => {
    setAddressForm({
      recipient_name: '',
      phone: '',
      street_address: '',
      city: '',
      province: '',
      postal_code: '',
      is_default: false,
    });
  };

  const handleAddressSubmit = async () => {
    setAddressLoading(true);
    try {
      if (editingAddress) {
        // Update existing address
        const updated = await addressService.updateAddress(editingAddress.id, addressForm);
        setAddresses(prev =>
          prev.map(a =>
            a.id === updated.id
              ? { ...updated }
              : addressForm.is_default ? { ...a, is_default: false } : a
          )
        );
        toast.success('Address updated successfully');
      } else {
        // Create new address
        const created = await addressService.createAddress(addressForm);
        if (addressForm.is_default) {
          setAddresses(prev => [
            ...prev.map(a => ({ ...a, is_default: false })),
            { ...created },
          ]);
        } else {
          setAddresses(prev => [...prev, { ...created }]);
        }
        toast.success('Address added successfully');
      }
      setShowAddressModal(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setAddressLoading(true);
    try {
      await addressService.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      setShowDeleteConfirm(null);
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setAddressLoading(true);
    try {
      await addressService.setDefault(id);
      setAddresses(prev =>
        prev.map(a => ({ ...a, is_default: a.id === id }))
      );
      toast.success('Default address updated');
    } catch (error) {
      console.error('Failed to set default:', error);
      toast.error('Failed to update default address.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm(address);
    setShowAddressModal(true);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setSecurityLoading(true);
    try {
      await authService.changePassword(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
      toast.success('Password changed successfully. Please log in again on other devices.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to change password';
      // Axios wraps the response error message
      const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      toast.error(axiosMsg ?? msg);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      toast.error('Please enter your password to confirm');
      return;
    }
    setSecurityLoading(true);
    try {
      await authService.deleteAccount(deleteConfirmPassword);
      toast.success('Account deleted. Goodbye!');
      logout();
      router.push('/');
    } catch (error) {
      const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      toast.error(axiosMsg ?? 'Failed to delete account');
    } finally {
      setSecurityLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmPassword('');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div
        ref={headerRef}
        className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white py-12"
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-700 ring-4 ring-white/20 flex items-center justify-center">
                <AvatarSVG name={userData.name} size={96} />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              </button>
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold">{userData.name}</h1>
              <p className="text-gray-300 flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {userData.email}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Member since {new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === tab.id
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
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your personal details</CardDescription>
                      </div>
                      {!isEditing ? (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          {isEditing ? (
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                          ) : (
                            <p className="text-gray-900 dark:text-gray-100 font-medium py-2">
                              {userData.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <p className="text-gray-900 dark:text-gray-100 font-medium py-2 flex items-center gap-2">
                            {userData.email}
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              Verified
                            </span>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          {isEditing ? (
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          ) : (
                            <p className="text-gray-900 dark:text-gray-100 font-medium py-2">
                              {userData.phone || '-'}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Saved Addresses</CardTitle>
                        <CardDescription>Manage your delivery addresses</CardDescription>
                      </div>
                      <Button
                        disabled={addressLoading}
                        onClick={() => {
                          setEditingAddress(null);
                          resetAddressForm();
                          setAddressForm(prev => ({
                            ...prev,
                            recipient_name: userData.name,
                            phone: userData.phone,
                          }));
                          setShowAddressModal(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Address
                      </Button>
                    </CardHeader>
                    <CardContent className="relative">
                      {/* Loading overlay */}
                      {addressLoading && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Saving...</span>
                          </div>
                        </div>
                      )}

                      {addresses.length === 0 ? (
                        <div className="text-center py-12">
                          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">No saved addresses</p>
                          <p className="text-gray-500 text-sm mt-1">Add an address for faster checkout</p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {addresses.map(address => (
                            <div
                              key={address.id}
                              className={`relative p-4 rounded-lg border-2 transition-colors ${address.is_default
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                              {/* Header: badge + action buttons */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {address.is_default && (
                                    <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    disabled={addressLoading}
                                    onClick={() => handleEditAddress(address)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                    disabled={addressLoading}
                                    onClick={() => setShowDeleteConfirm(address.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Address details */}
                              <p className="font-medium">{address.recipient_name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                {address.street_address}
                                {address.address_line2 && `, ${address.address_line2}`}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {address.city}, {address.province} {address.postal_code}
                              </p>

                              {/* Set as Default button for non-default addresses */}
                              {!address.is_default && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 w-full text-xs h-7"
                                  disabled={addressLoading}
                                  onClick={() => handleSetDefault(address.id)}
                                >
                                  Set as Default
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}


              {/* Security Tab */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your password regularly for better security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordForm.current}
                            onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordForm.new}
                            onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordForm.confirm}
                            onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={handlePasswordChange}
                        disabled={securityLoading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
                      >
                        {securityLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="mt-6 border-red-200 dark:border-red-900">
                    <CardHeader>
                      <CardTitle className="text-red-600">Danger Zone</CardTitle>
                      <CardDescription>Irreversible and destructive actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Delete Account</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={securityLoading}
                          onClick={() => {
                            setDeleteConfirmPassword('');
                            setShowDeleteDialog(true);
                          }}
                        >
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}


              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
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
                      {[
                        { key: 'email_orders', label: 'Order Updates', desc: 'Get notified about your order status' },
                        { key: 'email_promotions', label: 'Promotions', desc: 'Receive promotional offers and discounts' },
                        { key: 'email_newsletter', label: 'Newsletter', desc: 'Weekly updates about new products and trends' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => setNotifications(prev => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof typeof notifications]
                            }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications]
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : ''
                                }`}
                            />
                          </button>
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
                      {[
                        { key: 'push_orders', label: 'Order Updates', desc: 'Instant notifications for order changes' },
                        { key: 'push_promotions', label: 'Flash Sales', desc: 'Be first to know about limited deals' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => setNotifications(prev => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof typeof notifications]
                            }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications]
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : ''
                                }`}
                            />
                          </button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-name">Recipient Name</Label>
                <Input
                  id="addr-name"
                  value={addressForm.recipient_name}
                  onChange={e => setAddressForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-phone">Phone</Label>
                <Input
                  id="addr-phone"
                  value={addressForm.phone}
                  onChange={e => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-street">Street Address <span className="text-red-500">*</span></Label>
              <Input
                id="addr-street"
                placeholder="Jl. Sudirman No. 123"
                value={addressForm.street_address}
                onChange={e => setAddressForm(prev => ({ ...prev, street_address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-line2">Address Line 2 <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                id="addr-line2"
                placeholder="Apt, Suite, Floor, Building, etc."
                value={addressForm.address_line2 ?? ''}
                onChange={e => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-city">City <span className="text-red-500">*</span></Label>
                <Input
                  id="addr-city"
                  placeholder="Jakarta Selatan"
                  value={addressForm.city}
                  onChange={e => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-province">Province <span className="text-red-500">*</span></Label>
                <Input
                  id="addr-province"
                  placeholder="DKI Jakarta"
                  value={addressForm.province}
                  onChange={e => setAddressForm(prev => ({ ...prev, province: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-postal">Postal Code <span className="text-red-500">*</span></Label>
              <Input
                id="addr-postal"
                placeholder="12190"
                value={addressForm.postal_code}
                onChange={e => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addressForm.is_default}
                onChange={e => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span>Set as default address</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={addressLoading}
              onClick={() => {
                setShowAddressModal(false);
                setEditingAddress(null);
                resetAddressForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddressSubmit} disabled={addressLoading}>
              {addressLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>{editingAddress ? 'Update' : 'Add'} Address</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteAddress(showDeleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={open => { setShowDeleteDialog(open); if (!open) setDeleteConfirmPassword(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data (orders, addresses, wishlist). <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? 'text' : 'password'}
                  placeholder="Your current password"
                  value={deleteConfirmPassword}
                  onChange={e => setDeleteConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowDeletePassword(v => !v)}
                >
                  {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={securityLoading}
              onClick={() => { setShowDeleteDialog(false); setDeleteConfirmPassword(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={securityLoading || !deleteConfirmPassword}
              onClick={handleDeleteAccount}
            >
              {securityLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete My Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
