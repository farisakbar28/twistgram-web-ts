/**
 * AuthContext — global auth state management
 * Ref: SRS §3, Business Rules §3.6
 *
 * Menyediakan: currentUser, isAuthenticated, login, logout, register,
 * failedLoginCount (untuk AUTH-04 display), dan isLoading.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { User, LoginPayload, RegisterPayload } from '../../types/auth';
import { getStoredUser } from '../../services/session';
import { clearStoredSession } from '../../services/session';

// Fase 7: endpoint-service contract sudah dipindahkan ke src/services.
// AuthContext tetap hydrate dari adapter session lokal, sementara operasi auth
// berjalan melalui services entrypoint agar mock↔api bisa ditukar tanpa ubah UI.
import {
  authLogin as authLoginFromService,
  authLogout as authLogoutFromService,
  authRegister as authRegisterFromService,
} from '../../services';

// ============================================================
// Context shape
// ============================================================

interface AuthContextValue {
  currentUser: User | null;
  isAuthenticated: boolean;
  /** true saat request sedang berjalan */
  isLoading: boolean;
  /**
   * Login dengan email atau username + password.
   * Throws string error jika gagal.
   */
  login: (payload: LoginPayload) => Promise<void>;
  /**
   * Logout sesi saat ini.
   */
  logout: () => Promise<void>;
  /**
   * Registrasi akun baru.
   * Returns email pengguna yang perlu diverifikasi OTP.
   * Throws string error jika gagal.
   */
  register: (payload: RegisterPayload) => Promise<string>;
  /**
   * Update currentUser setelah email terverifikasi.
   * Dipanggil dari OtpVerifyPage setelah OTP sukses.
   */
  markEmailVerified: () => void;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // true saat hydrate dari storage

  // Hydrate session dari localStorage saat mount
  useEffect(() => {
    const saved = getStoredUser();
    setCurrentUser(saved);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authLoginFromService(payload);
      setCurrentUser(response.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authLogoutFromService();
    } finally {
      setCurrentUser(null);
      clearStoredSession();
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<string> => {
    setIsLoading(true);
    try {
      const response = await authRegisterFromService(payload);

      setCurrentUser(response.user);
      return payload.email;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markEmailVerified = useCallback(() => {
    const saved = getStoredUser();
    setCurrentUser(saved);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser && currentUser.email_verified,
      isLoading,
      login,
      logout,
      register,
      markEmailVerified,
    }),
    [currentUser, isLoading, login, logout, register, markEmailVerified]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================
// Hook
// ============================================================

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam <AuthProvider>');
  }
  return ctx;
};
