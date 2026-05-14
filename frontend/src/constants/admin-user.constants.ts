export type AdminUserStatus = 'active' | 'suspended' | 'banned';
export type AdminUserRole = 'customer' | 'admin';

export const ADMIN_USER_STATUS_LABELS: Record<AdminUserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
};

export const ADMIN_USER_STATUS_BADGE_COLORS: Record<AdminUserStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  banned: 'bg-red-100 text-red-800',
};

export const ADMIN_USER_ROLE_LABELS: Record<AdminUserRole, string> = {
  customer: 'Customer',
  admin: 'Admin',
};

export const ADMIN_USER_ROLE_BADGE_COLORS: Record<AdminUserRole, string> = {
  customer: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export const ADMIN_USER_STATUS_FILTER_OPTIONS = [
  { value: 'active', label: ADMIN_USER_STATUS_LABELS.active },
  { value: 'suspended', label: ADMIN_USER_STATUS_LABELS.suspended },
  { value: 'banned', label: ADMIN_USER_STATUS_LABELS.banned },
] as const;

export const ADMIN_USER_ROLE_FILTER_OPTIONS = [
  { value: 'customer', label: ADMIN_USER_ROLE_LABELS.customer },
  { value: 'admin', label: ADMIN_USER_ROLE_LABELS.admin },
] as const;

export const ADMIN_USER_ACTIVITY_TYPES = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'account_created', label: 'Account Created' },
  { value: 'payment_process', label: 'Payment Process' },
] as const;

export const ADMIN_USER_ACTIVITY_LABELS: Record<string, string> = {
  login: 'Logged in',
  logout: 'Logged out',
  purchase: 'Made a purchase',
  profile_update: 'Updated profile',
  password_change: 'Changed password',
  account_created: 'Account created',
  payment_process: 'Payment processed',
};

export const ADMIN_USER_STATUS_REASONS = {
  suspended: [
    { value: 'terms_violation', label: 'Terms of Service Violation' },
    { value: 'suspicious_activity', label: 'Suspicious Activity' },
    { value: 'payment_issue', label: 'Payment Issue' },
    { value: 'manual_review', label: 'Manual Review Required' },
    { value: 'other', label: 'Other' },
  ],
  banned: [
    { value: 'fraud', label: 'Fraudulent Activity' },
    { value: 'severe_violation', label: 'Severe Terms Violation' },
    { value: 'repeated_violations', label: 'Repeated Violations' },
    { value: 'abusive_behavior', label: 'Abusive Behavior' },
    { value: 'other', label: 'Other' },
  ],
} as const;
