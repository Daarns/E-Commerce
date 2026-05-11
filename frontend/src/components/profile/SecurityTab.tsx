'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SecurityTabProps {
  onPasswordChange: (current: string, newPassword: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
}

export function SecurityTab({
  onPasswordChange,
  onDeleteAccount,
  isLoading,
}: SecurityTabProps) {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }
    try {
      await onPasswordChange(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      alert('Please enter your password to confirm');
      return;
    }
    try {
      await onDeleteAccount(deleteConfirmPassword);
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

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
                  onChange={e =>
                    setPasswordForm(prev => ({ ...prev, current: e.target.value }))
                  }
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    setShowPasswords(prev => ({ ...prev, current: !prev.current }))
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  onChange={e =>
                    setPasswordForm(prev => ({ ...prev, new: e.target.value }))
                  }
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  onChange={e =>
                    setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))
                  }
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={
                isLoading ||
                !passwordForm.current ||
                !passwordForm.new ||
                !passwordForm.confirm
              }
            >
              {isLoading ? (
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
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={isLoading}
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

      {/* Delete Account Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={open => {
          setShowDeleteDialog(open);
          if (!open) setDeleteConfirmPassword('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data (orders,
              addresses, wishlist). <strong>This action cannot be undone.</strong>
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
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowDeletePassword(v => !v)}
                >
                  {showDeletePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={isLoading}
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading || !deleteConfirmPassword}
              onClick={handleDeleteAccount}
            >
              {isLoading ? (
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
    </>
  );
}
