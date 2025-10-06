'use client';

import { useState, useEffect } from 'react';

const ADMIN_SESSION_KEY = 'gosa_admin_session';
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface AdminSession {
  authenticated: boolean;
  timestamp: number;
}

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
        const session: AdminSession = JSON.parse(sessionData);
        const now = Date.now();

        // Check if session is still valid (within 4 hours)
        if (session.authenticated && (now - session.timestamp) < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          // Session expired, clear it
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify password with API
      const response = await fetch('/api/v1/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store session
        const session: AdminSession = {
          authenticated: true,
          timestamp: Date.now(),
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        setIsAuthenticated(true);
        return true;
      } else {
        setError(data.error || 'Invalid password');
        return false;
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError('Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
    setError(null);
  };

  const extendSession = () => {
    if (isAuthenticated) {
      const session: AdminSession = {
        authenticated: true,
        timestamp: Date.now(),
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    }
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    extendSession,
  };
}