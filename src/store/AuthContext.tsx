import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/apiClient';
import { authService } from '@/services/auth';
import { secureStorage } from '@/services/secureStorage';
import { pushNotificationsService } from '@/services/pushNotifications';
import type { User } from '@/types/api';
import { ENV } from '@/config/env';

const STORAGE_KEY = 'mobile.auth.token';

// Configure Google Sign-In once at module scope
GoogleSignin.configure({
  webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
  scopes: ['email', 'profile'],
});

type AuthContextValue = {
  user: User | null;
  token: string | null;
  bootstrapping: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const logoutInFlightRef = useRef(false);

  const persistToken = async (nextToken: string) => {
    try {
      await secureStorage.setSecureItem(STORAGE_KEY, nextToken);
    } catch {
      await AsyncStorage.setItem(STORAGE_KEY, nextToken);
    }
  };

  const clearPersistedToken = async () => {
    try {
      await secureStorage.removeSecureItem(STORAGE_KEY);
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    apiClient.setToken(null);
    await clearPersistedToken();
  }, []);

  const applySession = async (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    apiClient.setToken(nextToken);
    await persistToken(nextToken);
  };

  // Auto-logout on 401 (expired/revoked token)
  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      if (logoutInFlightRef.current) return;
      logoutInFlightRef.current = true;
      clearSession().finally(() => { logoutInFlightRef.current = false; });
    });
    return () => { apiClient.setOnUnauthorized(null); };
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;
    const loadToken = async () => {
      try {
        let stored: string | null = null;
        try {
          stored = await secureStorage.getSecureItem(STORAGE_KEY);
        } catch {
          stored = null;
        }

        if (!stored) {
          const legacy = await AsyncStorage.getItem(STORAGE_KEY);
          if (legacy) {
            try {
              await secureStorage.setSecureItem(STORAGE_KEY, legacy);
              await AsyncStorage.removeItem(STORAGE_KEY);
            } catch {
              // Keep legacy token if secure storage is unavailable.
            }
            stored = legacy;
          }
        }

        if (!mounted) return;

        if (stored) {
          setToken(stored);
          apiClient.setToken(stored);
          try {
            const current = await authService.me();
            if (!mounted) return;
            setUser(current);
          } catch {
            if (!mounted) return;
            setToken(null);
            setUser(null);
            apiClient.setToken(null);
            await clearPersistedToken();
          } finally {
            if (mounted) setBootstrapping(false);
          }
        } else {
          if (mounted) setBootstrapping(false);
        }
      } catch {
        if (mounted) setBootstrapping(false);
      }
    };

    loadToken();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      await applySession(response.token, response.user);
      pushNotificationsService.registerCurrentTokenForUser().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    setLoading(true);
    try {
      const response = await authService.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      await applySession(response.token, response.user);
      pushNotificationsService.registerCurrentTokenForUser().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Ensure Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Show native Google account picker
      await GoogleSignin.signIn();

      // Get the access token from the signed-in account
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken;

      if (!accessToken) {
        throw new Error('google_auth_failed');
      }

      // Send access token to backend for verification and user creation
      const response = await authService.loginWithGoogleToken(accessToken);
      await applySession(response.token, response.user);
      pushNotificationsService.registerCurrentTokenForUser().catch(() => {});
    } catch (error: unknown) {
      // Sign out of Google to allow picking a different account next time
      try { await GoogleSignin.signOut(); } catch { /* ignore */ }

      // Map cancellation to existing error string
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        throw new Error('google_auth_cancelled');
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      pushNotificationsService.syncUser(null);
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    try { await GoogleSignin.signOut(); } catch { /* ignore */ }
    try {
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (password?: string) => {
    setLoading(true);
    try {
      pushNotificationsService.syncUser(null);
      await authService.deleteAccount(password);
    } finally {
      try { await GoogleSignin.signOut(); } catch { /* ignore */ }
      try {
        await clearSession();
      } finally {
        setLoading(false);
      }
    }
  };

  const refresh = async () => {
    const current = await authService.me();
    setUser(current);
  };

  const value = { user, token, bootstrapping, loading, login, register, loginWithGoogle, logout, deleteAccount, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
