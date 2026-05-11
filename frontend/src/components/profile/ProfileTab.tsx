'use client';

import { Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface ProfileTabProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  isEditing: boolean;
  formData: {
    name: string;
    phone: string;
  };
  onEditClick: () => void;
  onCancelClick: () => void;
  onSaveClick: () => void;
  onFormChange: (field: 'name' | 'phone', value: string) => void;
}

export function ProfileTab({
  userName,
  userEmail,
  userPhone,
  isEditing,
  formData,
  onEditClick,
  onCancelClick,
  onSaveClick,
  onFormChange,
}: ProfileTabProps) {
  return (
    <motion.div
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
            <Button variant="outline" onClick={onEditClick}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onCancelClick}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={onSaveClick}>
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
                  onChange={e => onFormChange('name', e.target.value)}
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium py-2">
                  {userName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <p className="text-gray-900 dark:text-gray-100 font-medium py-2 flex items-center gap-2">
                {userEmail}
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
                  onChange={e => onFormChange('phone', e.target.value)}
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium py-2">
                  {userPhone || '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
