import { useState } from 'react';
import { userService } from '@/services/user';
import { toast } from 'sonner';

interface ProfileFormData {
  name: string;
  phone: string;
}

interface ProfileEditResult {
  id: string;
  email: string;
  name: string;
  phone: string;
  created_at: string;
}

export function useProfileEdit(initialData: ProfileFormData) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(initialData);

  const handleEditStart = () => {
    setFormData(initialData);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setFormData(initialData);
    setIsEditing(false);
  };

  const handleFormChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (): Promise<ProfileEditResult | null> => {
    setIsLoading(true);
    try {
      const updatedUser = await userService.updateProfile({
        name: formData.name,
        phone: formData.phone,
      });

      setIsEditing(false);
      toast.success('Profile updated successfully');

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone || '',
        created_at: updatedUser.created_at,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEditing,
    isLoading,
    formData,
    handleEditStart,
    handleEditCancel,
    handleFormChange,
    handleSaveProfile,
  };
}
