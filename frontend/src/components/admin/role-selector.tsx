'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface RoleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: 'customer' | 'admin';
  userName: string;
  onConfirm: (newRole: 'customer' | 'admin') => Promise<void>;
}

export function RoleSelector({ open, onOpenChange, currentRole, userName, onConfirm }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'admin'>(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(selectedRole);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedRole(currentRole);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update the role for {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Role</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="customer"
                  name="role"
                  value="customer"
                  checked={selectedRole === 'customer'}
                  onChange={(e) => setSelectedRole(e.target.value as 'customer' | 'admin')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="customer" className="ml-2 block text-sm text-gray-700">
                  <span className="font-medium">Customer</span>
                  <p className="text-gray-500 text-xs">Regular customer account with purchase access</p>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="admin"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={(e) => setSelectedRole(e.target.value as 'customer' | 'admin')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="admin" className="ml-2 block text-sm text-gray-700">
                  <span className="font-medium">Admin</span>
                  <p className="text-gray-500 text-xs">Admin account with full management access</p>
                </label>
              </div>
            </div>
          </div>

          {selectedRole !== currentRole && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ This will change {userName}'s access level. Admins can manage products, orders, and users.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedRole === currentRole}
          >
            {isLoading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
