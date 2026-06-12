export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: 'customer' | 'admin';
  status?: 'active' | 'suspended' | 'banned';
  is_verified: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
