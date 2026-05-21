'use client';

import { motion } from 'framer-motion';
import { MapPin, Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAddressesTab } from '@/hooks/useAddressesTab';
import { Address } from '@/types';
import { AddressFormDialog } from './AddressFormDialog';

interface AddressesTabProps {
  addresses: Address[];
  isLoading: boolean;
  onAddAddress: (data: Partial<Address>) => Promise<void>;
  onEditAddress: (id: string, data: Partial<Address>) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

export function AddressesTab({
  addresses,
  isLoading,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  onSetDefault,
}: AddressesTabProps) {
  const {
    showAddressModal,
    editingAddress,
    showDeleteConfirm,
    setShowAddressModal,
    setShowDeleteConfirm,
    handleAddNew,
    handleEdit,
    handleDelete,
    handleSubmitAddress,
  } = useAddressesTab({
    onAddAddress,
    onEditAddress,
    onDeleteAddress,
  });

  return (
    <>
      <motion.div
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
            <Button disabled={isLoading} onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </CardHeader>
          <CardContent className="relative">
            {/* Loading overlay */}
            {isLoading && (
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
                    className={`relative p-4 rounded-lg border-2 transition-colors ${
                      address.is_default
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
                          disabled={isLoading}
                          onClick={() => handleEdit(address)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          disabled={isLoading}
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
                        disabled={isLoading}
                        onClick={() => onSetDefault(address.id)}
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

      {/* Address Form Modal */}
      <AddressFormDialog
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        editingAddress={editingAddress}
        onSubmit={handleSubmitAddress}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this address? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => {
                if (showDeleteConfirm) void handleDelete(showDeleteConfirm);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
