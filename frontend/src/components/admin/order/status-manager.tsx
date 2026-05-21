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
import { Textarea } from '@/components/ui/textarea';
import { ADMIN_USER_STATUS_REASONS } from '@/constants/admin-user.constants';

interface StatusManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: 'active' | 'suspended' | 'banned';
  userName: string;
  onConfirm: (newStatus: 'active' | 'suspended' | 'banned', reason?: string) => Promise<void>;
}

export function StatusManager({
  open,
  onOpenChange,
  currentStatus,
  userName,
  onConfirm,
}: StatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'suspended' | 'banned'>(currentStatus);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (selectedStatus !== 'active' && !selectedReason) {
      alert('Please select a reason');
      return;
    }

    setIsLoading(true);
    try {
      const reason = selectedReason === 'other' ? customReason : selectedReason;
      await onConfirm(selectedStatus, reason);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus(currentStatus);
      setSelectedReason('');
      setCustomReason('');
    }
    onOpenChange(newOpen);
  };

  const currentReasons = selectedStatus === 'suspended'
    ? ADMIN_USER_STATUS_REASONS.suspended
    : ADMIN_USER_STATUS_REASONS.banned;
  const showReasonFields = selectedStatus !== 'active';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Status</DialogTitle>
          <DialogDescription>
            Update account status for {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Status</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="active"
                  name="status"
                  value="active"
                  checked={selectedStatus === 'active'}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as 'active' | 'suspended' | 'banned');
                    setSelectedReason('');
                    setCustomReason('');
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="active" className="ml-2 block text-sm">
                  <span className="font-medium text-gray-900">Active</span>
                  <p className="text-gray-500 text-xs">Normal account access</p>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="suspended"
                  name="status"
                  value="suspended"
                  checked={selectedStatus === 'suspended'}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as 'active' | 'suspended' | 'banned');
                    setSelectedReason('');
                    setCustomReason('');
                  }}
                  className="h-4 w-4 text-yellow-600"
                />
                <label htmlFor="suspended" className="ml-2 block text-sm">
                  <span className="font-medium text-gray-900">Suspended</span>
                  <p className="text-gray-500 text-xs">Temporary account restriction</p>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="banned"
                  name="status"
                  value="banned"
                  checked={selectedStatus === 'banned'}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as 'active' | 'suspended' | 'banned');
                    setSelectedReason('');
                    setCustomReason('');
                  }}
                  className="h-4 w-4 text-red-600"
                />
                <label htmlFor="banned" className="ml-2 block text-sm">
                  <span className="font-medium text-gray-900">Banned</span>
                  <p className="text-gray-500 text-xs">Permanent account restriction</p>
                </label>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          {showReasonFields && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for {selectedStatus === 'suspended' ? 'Suspension' : 'Ban'}
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason...</option>
                {currentReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>

              {/* Custom Reason */}
              {selectedReason === 'other' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Details
                  </label>
                  <Textarea
                    placeholder="Provide more details about the reason for this action..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {selectedStatus !== 'active' && selectedStatus !== currentStatus && (
            <div className={`border rounded-lg p-3 ${
              selectedStatus === 'banned' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm ${
                selectedStatus === 'banned' 
                  ? 'text-red-800' 
                  : 'text-yellow-800'
              }`}>
                ⚠️ This action will {selectedStatus === 'banned' ? 'permanently ban' : 'suspend'} {userName}&apos;s account. They will not be able to access their account.
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
            disabled={isLoading || (selectedStatus === currentStatus) || (showReasonFields && !selectedReason)}
            variant={selectedStatus === 'banned' ? 'destructive' : 'default'}
          >
            {isLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
