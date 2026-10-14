'use client';

import { apiFetch } from '@/lib/api/client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Search,
  Heart,
  User,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Settings,
  LogOut,
  BookmarkCheck,
  ChevronDown,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useFavoritesStore } from '@/lib/favorites/store';
import { BrandLockup } from '@/components/layout/brand-mark';
import { currentUser } from '@/lib/api/endpoints';
import { onAuthChanged } from '@/lib/auth/events';
import { cn } from '@/lib/cn';
import type { PrivateUser } from '@/lib/api/types';

const NAV_LINKS = [
  { href: '/search', label: 'Explore' },
  { href: '/search?type=PG', label: 'PGs & Hostels' },
  { href: '/search?type=FLAT', label: 'Flats' },
  { href: '/city/bangalore', label: 'Cities' },
];

const ACCOUNT_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/saved-searches', label: 'Saved searches', icon: BookmarkCheck },
  { href: '/dashboard/profile', label: 'Profile & settings', icon: Settings },
];

type SessionState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authed'; user: PrivateUser };

/**
 * Header session state is resolved on the client because tokens live in httpOnly
 * cookies. While it resolves we render a fixed-width placeholder so the actions
 * area never changes size (no layout shift when auth state becomes available).
 */
function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const resolve = () => {
      void currentUser().then((user) => {
        if (!active) return;
        setState(user ? { status: 'authed', user } : { status: 'guest' });
      });
    };

    resolve();
    // The header sits in the root layout and survives client navigation, so a
    // login/logout performed elsewhere must re-run the session lookup.
    const unsubscribe = onAuthChanged(resolve);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}

function AccountMenu({ user }: { user: PrivateUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const initial = user.name?.trim().charAt(0).toUpperCase() || 'U';

  const signOut = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => null);
    // Drop cached saved ids so the next account starts clean.
    useFavoritesStore.getState().reset();
    window.location.href = '/login';
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initial}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border bg-card shadow-popover animate-menu-in"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-0.5 p-1.5">
            {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> {label}
              </Link>
            ))}
            <div className="my-1 border-t" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Fixed-width placeholder that keeps the actions row size-stable while auth loads. */
function SessionPlaceholder() {
  return <div className="h-9 w-[9.5rem] rounded-lg bg-muted/60 animate-pulse" aria-hidden />;
}

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const session = useSession();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="StayNearby home">
            <BrandLockup />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm font-medium md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Search rentals"
          >
            <Search className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/dashboard/favorites"
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Saved properties"
          >
            <Heart className="h-4 w-4" aria-hidden />
          </Link>

          {session.status === 'loading' ? (
            <SessionPlaceholder />
          ) : session.status === 'authed' ? (
            <>
              <Link
                href="/dashboard/properties/new"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
              >
                <Plus className="h-4 w-4" aria-hidden /> Post property
              </Link>
              <AccountMenu user={session.user} />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Sign in
              </Link>
              <Link
                href="/dashboard/properties/new"
                className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5' })}
              >
                <Plus className="h-4 w-4" aria-hidden /> Post property
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile"
          className="border-b bg-background px-4 py-3 shadow-popover animate-menu-in md:hidden"
        >
          <div className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard/favorites"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Heart className="h-4 w-4" aria-hidden /> Saved properties
            </Link>
          </div>

          <div className="mt-2 flex flex-col gap-2 border-t pt-3">
            <Link
              href="/dashboard/properties/new"
              className={buttonVariants({ variant: 'outline', className: 'w-full justify-center' })}
            >
              <Plus className="h-4 w-4" aria-hidden /> Post property
            </Link>
            {session.status === 'authed' ? (
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: 'default', className: 'w-full justify-center' })}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Go to dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({ variant: 'default', className: 'w-full justify-center' })}
              >
                <User className="h-4 w-4" aria-hidden /> Sign in / Register
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
