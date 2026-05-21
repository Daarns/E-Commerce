import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface PasswordFormData {
  current: string;
  new: string;
  confirm: string;
}

interface PasswordVisibility {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

interface UseSecurityTabParams {
  onPasswordChange: (current: string, newPassword: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}

interface UseSecurityTabReturn {
  passwordForm: PasswordFormData;
  showPasswords: PasswordVisibility;
  showDeleteDialog: boolean;
  deleteConfirmPassword: string;
  showDeletePassword: boolean;
  setDeleteConfirmPassword: (password: string) => void;
  setShowDeletePassword: Dispatch<SetStateAction<boolean>>;
  updatePasswordField: (field: keyof PasswordFormData, value: string) => void;
  togglePasswordVisibility: (field: keyof PasswordVisibility) => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setDeleteDialogOpen: (open: boolean) => void;
  handlePasswordChange: () => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
}

export function useSecurityTab({
  onPasswordChange,
  onDeleteAccount,
}: UseSecurityTabParams): UseSecurityTabReturn {
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState<PasswordVisibility>({
    current: false,
    new: false,
    confirm: false,
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const updatePasswordField = (field: keyof PasswordFormData, value: string): void => {
    setPasswordForm((previous) => ({ ...previous, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibility): void => {
    setShowPasswords((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const openDeleteDialog = (): void => {
    setDeleteConfirmPassword('');
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = (): void => {
    setShowDeleteDialog(false);
    setDeleteConfirmPassword('');
  };

  const setDeleteDialogOpen = (open: boolean): void => {
    setShowDeleteDialog(open);
    if (!open) setDeleteConfirmPassword('');
  };

  const handlePasswordChange = async (): Promise<void> => {
    if (passwordForm.new !== passwordForm.confirm) {
      window.alert('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      window.alert('New password must be at least 8 characters');
      return;
    }

    try {
      await onPasswordChange(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!deleteConfirmPassword) {
      window.alert('Please enter your password to confirm');
      return;
    }

    try {
      await onDeleteAccount(deleteConfirmPassword);
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  return {
    passwordForm,
    showPasswords,
    showDeleteDialog,
    deleteConfirmPassword,
    showDeletePassword,
    setDeleteConfirmPassword,
    setShowDeletePassword,
    updatePasswordField,
    togglePasswordVisibility,
    openDeleteDialog,
    closeDeleteDialog,
    setDeleteDialogOpen,
    handlePasswordChange,
    handleDeleteAccount,
  };
}
