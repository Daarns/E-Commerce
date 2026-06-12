'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ShieldCheck, Trash2 } from 'lucide-react';
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
  email: string;
  onPasswordResetRequest: (email: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
}

export function SecurityTab({
  email,
  onPasswordResetRequest,
  onDeleteAccount,
  isLoading,
}: SecurityTabProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  const handlePasswordResetRequest = async (): Promise<void> => {
    await onPasswordResetRequest(email);
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!deleteConfirmPassword) return;
    await onDeleteAccount(deleteConfirmPassword);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Account Security
            </CardTitle>
            <CardDescription>
              Password changes use a secure reset link sent to your registered email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Reset password by email</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{email}</p>
                </div>
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handlePasswordResetRequest()}
                  className="shrink-0 gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Reset Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-md border border-red-100 p-4 sm:flex-row sm:items-start sm:justify-between dark:border-red-900/60">
              <div className="min-w-0">
                <p className="font-medium text-sm">Delete Account</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently delete your account and associated personal data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={isLoading}
                onClick={() => setShowDeleteDialog(true)}
                className="shrink-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteConfirmPassword('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              Enter your password to confirm account deletion. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-password">Current password</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Your current password"
              value={deleteConfirmPassword}
              onChange={(event) => setDeleteConfirmPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleDeleteAccount();
              }}
              disabled={isLoading}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading || !deleteConfirmPassword}
              onClick={() => void handleDeleteAccount()}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
