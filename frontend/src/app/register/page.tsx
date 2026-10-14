'use client';
import { apiFetch, readErrorMessage } from '@/lib/api/client';
import { useFavoritesStore } from '@/lib/favorites/store';
import { notifyAuthChanged } from '@/lib/auth/events';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, User, Home, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'OWNER' ? 'OWNER' : 'TENANT';

  const [role, setRole] = useState<'TENANT' | 'OWNER'>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // The API expects a bare `+?digits` phone; drop the spacing users type naturally.
    const normalizedPhone = phone.replace(/[\s()-]/g, '');

    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          acceptTerms: accepted,
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        }),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, 'Registration failed. Please check your inputs.'));
        return;
      }

      useFavoritesStore.getState().reset();
      notifyAuthChanged();
      router.push('/dashboard');
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a StayNearby account to find a home or list your property.
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('TENANT')}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
              role === 'TENANT'
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-semibold">I'm a Tenant</span>
            <span className="text-[10px] text-muted-foreground">Find PGs, rooms & flats</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('OWNER')}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
              role === 'OWNER'
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-semibold">I'm an Owner</span>
            <span className="text-[10px] text-muted-foreground">Post listings & manage</span>
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
              htmlFor="register-name"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="register-name"
                type="text"
                required
                placeholder="Rohan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="register-email"
                type="email"
                required
                placeholder="rohan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-phone"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
            >
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
            >
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <input
              id="register-terms"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <label htmlFor="register-terms" className="text-xs text-muted-foreground leading-relaxed">
              I agree to the StayNearby terms of use and privacy policy.
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !accepted}
            className="w-full mt-2 font-semibold gap-1.5"
          >
            {loading ? 'Creating account...' : 'Create Account'} <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center p-8">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
