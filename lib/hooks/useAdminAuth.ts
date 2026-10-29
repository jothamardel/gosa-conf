'use client';

import { useState, useEffect } from 'react';

const ADMIN_SESSION_KEY = 'gosa_admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds for convention desk shift

export interface AdminSession {
  authenticated: boolean;
  timestamp: number;
  adminId?: string;
  adminName?: string;
  phone?: string;
  role?: 'super_admin' | 'desk_admin';
  canBroadcast: boolean;
}

export function useAdminAuth() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = () => {
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (sessionData) {
        const parsedSession: AdminSession = JSON.parse(sessionData);
        const now = Date.now();

        // Check if session is still valid
        if (parsedSession.authenticated && now - parsedSession.timestamp < SESSION_DURATION) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setSession(null);
        }
      }
    } catch (err) {
      console.error('Error checking admin session:', err);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, pin?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const trimmed = identifier.trim();
      const response = await fetch('/api/v1/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: trimmed,
          phone: trimmed,
          pin: pin?.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.admin) {
        const newSession: AdminSession = {
          authenticated: true,
          timestamp: Date.now(),
          adminId: data.admin.id,
          adminName: data.admin.name,
          phone: data.admin.phone,
          role: data.admin.role,
          canBroadcast: !!data.admin.canBroadcast,
        };

        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return true;
      } else {
        setError(data.error || 'Authentication failed');
        return false;
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError('Login failed. Please check your network and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
    setError(null);
  };

  const extendSession = () => {
    if (session?.authenticated) {
      const updated: AdminSession = {
        ...session,
        timestamp: Date.now(),
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(updated));
      setSession(updated);
    }
  };

  return {
    isAuthenticated: !!session?.authenticated,
    session,
    adminName: session?.adminName || 'Admin',
    role: session?.role || 'desk_admin',
    canBroadcast: session?.canBroadcast ?? false,
    isLoading,
    error,
    login,
    logout,
    extendSession,
  };
}