'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { User, LoginResponse, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TOKENS'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'CLEAR_AUTH' };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    case 'SET_TOKENS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'CLEAR_AUTH':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pharma_access_token';
const REFRESH_KEY = 'pharma_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<User>('/auth/me');
      dispatch({ type: 'SET_USER', payload: response.data });
    } catch {
      // Don't clear tokens on failure - token may still be valid
      // Just mark as not loading so app renders
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      dispatch({ type: 'SET_TOKENS', payload: { accessToken: token, refreshToken: localStorage.getItem(REFRESH_KEY) || '' } });
      refreshUser();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    const data = response.data;

    if (!data.requires2FA && data.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      dispatch({
        type: 'SET_TOKENS',
        payload: { accessToken: data.accessToken, refreshToken: data.refreshToken || '' },
      });
      if (data.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
      }
    }

    return data;
  }, []);

  const verify2FA = useCallback(async (tempToken: string, code: string): Promise<void> => {
    const response = await apiClient.post<LoginResponse>('/auth/verify-2fa', {
      tempToken,
      code,
    });
    const data = response.data;

    if (data.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      dispatch({
        type: 'SET_TOKENS',
        payload: { accessToken: data.accessToken, refreshToken: data.refreshToken || '' },
      });
      if (data.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
      }
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      dispatch({ type: 'CLEAR_AUTH' });
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    verify2FA,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
