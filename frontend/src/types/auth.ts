export interface ForgotPasswordFormState {
  email: string;
  isLoading: boolean;
  errors: Record<string, string>;
  submitted: boolean;
  canResend: boolean;
  resendCountdown: number;
}

export interface ForgotPasswordActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleResend: () => Promise<void>;
  setEmail: (email: string) => void;
  resetForm: () => void;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormState {
  formData: LoginFormData;
  isLoading: boolean;
  showPassword: boolean;
  errors: Record<string, string>;
  showVerificationDialog: boolean;
  pendingEmail: string;
}

export interface LoginActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFormData: (data: LoginFormData) => void;
  setShowPassword: (show: boolean) => void;
  handleVerificationRedirect: () => void;
  setShowVerificationDialog: (show: boolean) => void;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface RegisterFormState {
  formData: RegisterFormData;
  isLoading: boolean;
  showPassword: boolean;
  errors: Record<string, string>;
}

export interface RegisterActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFormData: (data: RegisterFormData) => void;
  setShowPassword: (show: boolean) => void;
}
