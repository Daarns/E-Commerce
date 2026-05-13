'use client';

import { useState } from 'react';
import { AdminUser } from '@/services/admin';
import { RoleSelector } from '../role-selector';
import { StatusManager } from '../status-manager';
import { Button } from '@/components/ui/button';
import { Edit2, Shield } from 'lucide-react';

interface UserDetailActionsProps {
  user: AdminUser;
  onRoleUpdate: (newRole: 'customer' | 'admin') => Promise<void>;
  onStatusUpdate: (newStatus: 'active' | 'suspended' | 'banned', reason?: string) => Promise<void>;
}

export function UserDetailActions({ user, onRoleUpdate, onStatusUpdate }: UserDetailActionsProps) {
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRoleSelectorOpen(true)}
          className="flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          Change Role
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsStatusManagerOpen(true)}
          className="flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Change Status
        </Button>
      </div>

      <RoleSelector
        open={isRoleSelectorOpen}
        onOpenChange={setIsRoleSelectorOpen}
        currentRole={user.role}
        userName={user.name}
        onConfirm={onRoleUpdate}
      />

      <StatusManager
        open={isStatusManagerOpen}
        onOpenChange={setIsStatusManagerOpen}
        currentStatus={user.status}
        userName={user.name}
        onConfirm={onStatusUpdate}
      />
    </>
  );
}
