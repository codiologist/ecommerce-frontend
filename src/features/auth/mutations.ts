import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminKeys, authKeys } from '@/lib/query-keys';

import { accountApi, authApi } from './api';

import type { User } from './types';

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me() }),
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: authApi.resendVerification });
}

/** Login / 2FA completion: a new identity, so all cached data from before is dropped. */
function useStartSession() {
  const queryClient = useQueryClient();
  return (user: User) => {
    queryClient.clear();
    queryClient.setQueryData(authKeys.me(), user);
  };
}

export function useLogin() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (!data.twoFactorRequired) startSession(data.user);
    },
  });
}

export function useLoginTwoFactor() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: authApi.loginTwoFactor,
    onSuccess: (data) => {
      if (!data.twoFactorRequired) startSession(data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
    },
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      // All sessions were revoked server-side.
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountApi.changePassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountApi.revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  });
}

export function useReauth() {
  return useMutation({ mutationFn: authApi.reauth });
}

export function useSetupTwoFactor() {
  return useMutation({ mutationFn: authApi.setupTwoFactor });
}

export function useEnableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.enableTwoFactor,
    // Not awaited on purpose: the caller must get the backup codes (and switch its UI into
    // "show codes" mode) before `me` refetches with twoFactorEnabled=true.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.session() });
    },
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.disableTwoFactor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me() }),
  });
}
