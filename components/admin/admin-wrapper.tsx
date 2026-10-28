'use client';

import React from 'react';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import AdminLogin from './admin-login';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Clock } from 'lucide-react';

interface AdminWrapperProps {
  children: React.ReactNode;
}

export default function AdminWrapper({ children }: AdminWrapperProps) {
  const { isAuthenticated, isLoading, error, login, logout } = useAdminAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={login}
        error={error || undefined}
        loading={isLoading}
      />
    );
  }

  // Show admin content with logout option
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Admin Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 mr-2 flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                <span className="hidden sm:inline">GOSA Admin Dashboard</span>
                <span className="sm:hidden">GOSA Admin</span>
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:flex items-center text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Session: 4h
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center h-8 sm:h-9 px-2.5 sm:px-3 text-xs rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </div>
    </div>
  );
}