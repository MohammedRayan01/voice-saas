// Base user interface that all providers must support
export interface BaseUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

// Local/OSS/Supabase user type
export interface LocalUser extends BaseUser {
  provider: 'local' | 'supabase';
  organizationId?: string;
  displayName?: string;
  provider_id?: string;
}

// Union type for all user types (Stack removed — using Supabase)
export type AuthUser = LocalUser;

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface TeamPermission {
  id: string;
}

export type AuthProvider = 'stack' | 'local' | 'supabase';

export interface AuthConfig {
  provider: AuthProvider;
  [key: string]: string | number | boolean;
}
