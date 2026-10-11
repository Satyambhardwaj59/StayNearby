'use client';
import { apiFetch } from '@/lib/api/client';
import { useFavoritesStore } from '@/lib/favorites/store';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, Phone, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'password') {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Login failed. Please check credentials.');
        }
        useFavoritesStore.getState().reset();
        router.push('/dashboard');
      } else {
        if (!otpSent) {
          // Send OTP
          const res = await apiFetch('/auth/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: identifier, purpose: 'LOGIN' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || 'Failed to send OTP.');
          setOtpSent(true);
        } else {
          // Verify OTP
          const res = await apiFetch('/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: identifier, code: otp, purpose: 'LOGIN' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || 'Invalid OTP code.');
          useFavoritesStore.getState().reset();
        router.push('/dashboard');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your StayNearby account</p>
        </div>

        {/* Auth mode toggle */}
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setOtpSent(false);
              setError(null);
            }}
            className={`rounded-md py-2 transition ${
              authMode === 'password'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Password Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setOtpSent(false);
              setError(null);
            }}
            className={`rounded-md py-2 transition ${
              authMode === 'otp'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fast OTP Sign In
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-identifier"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
            >
              {authMode === 'password' ? 'Email Address' : 'Phone Number (+91)'}
            </label>
            <div className="relative">
              {authMode === 'password' ? (
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              ) : (
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              )}
              <input
                id="login-identifier"
                type={authMode === 'password' ? 'email' : 'tel'}
                required
                placeholder={authMode === 'password' ? 'you@example.com' : '+91 98765 43210'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {authMode === 'password' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border bg-background py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>
          ) : otpSent ? (
            <div>
              <label
                htmlFor="login-otp"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
              >
                6-Digit OTP Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full mt-2 font-semibold gap-1.5">
            {loading ? (
              'Authenticating...'
            ) : authMode === 'otp' && !otpSent ? (
              'Send OTP Code'
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
