/** Mirrors the backend's response types (ecommerce-backend/src/modules/auth, users). */
export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export const STAFF_ROLES: readonly Role[] = ['STAFF', 'ADMIN', 'SUPER_ADMIN'];

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
};

export type LoginResponse =
  { twoFactorRequired: false; user: User } | { twoFactorRequired: true; challengeId: string };

export type MessageResponse = { message: string };

export type ActiveSession = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

export type TwoFactorSetup = { otpauthUri: string; qrCodeDataUrl: string; secret: string };

export type AdminSession = { userId: string; role: Role; twoFactorVerified: boolean };

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  turnstileToken?: string;
};
export type LoginInput = { email: string; password: string; turnstileToken?: string };
export type LoginTwoFactorInput = { challengeId: string; code?: string; backupCode?: string };
export type UpdateProfileInput = { name?: string; phone?: string | null };
export type ChangePasswordInput = { currentPassword: string; newPassword: string };
export type ReauthInput = { password: string; code?: string };
