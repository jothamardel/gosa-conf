'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Shield, Phone, KeyRound, CheckCircle2 } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (identifier: string, pin?: string) => void;
  error?: string;
  loading?: boolean;
}

export default function AdminLogin({ onLogin, error, loading }: AdminLoginProps) {
  const [authMode, setAuthMode] = useState<'phone' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'phone') {
      if (phone.trim()) {
        onLogin(phone.trim(), pin.trim() || undefined);
      }
    } else {
      if (password.trim()) {
        onLogin(password.trim());
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-gray-50 to-emerald-50/60 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-indigo-600 to-amber-500" />
        <CardHeader className="text-center pt-7 pb-4">
          <div className="mx-auto mb-3 p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl w-fit border border-indigo-100 dark:border-indigo-900 shadow-sm">
            <Shield className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            GOSA 2026 Admin Portal
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            Ticket Verification, Check-In Desk & Event Management
          </CardDescription>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mt-5">
            <button
              type="button"
              onClick={() => setAuthMode('phone')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                authMode === 'phone'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Desk Admin (Phone)</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('password')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                authMode === 'password'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'phone' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="admin-phone" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Registered Admin Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="admin-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 09038753205 or +234 807..."
                      className="pl-9 rounded-xl h-11 text-sm font-medium"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Enter the WhatsApp phone number assigned to your desk account.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="admin-pin" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Security PIN <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="admin-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter 5-digit PIN if assigned"
                      className="pl-9 rounded-xl h-11 text-sm font-medium"
                      maxLength={6}
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Master Super Admin Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter master admin password"
                    className="pr-10 rounded-xl h-11 text-sm font-medium"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="rounded-xl py-2 px-3 text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
              disabled={loading || (authMode === 'phone' ? !phone.trim() : !password.trim())}
            >
              {loading ? (
                <>
                  <Lock className="w-4 h-4 mr-2 animate-spin" />
                  Verifying Permissions...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {authMode === 'phone' ? 'Access Check-in Desk' : 'Sign In as Super Admin'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <span>🔒 Role-Based Permissions Active:</span>
            </p>
            <p>
              • <strong>Desk Admins</strong>: Authorized for fast ticket scanning, attendee check-in, and walk-in ticket registrations.
            </p>
            <p>
              • <strong>Bulk Broadcast Messaging</strong>: Restricted exclusively to Super Administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}