'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft, RefreshCw, LogIn } from 'lucide-react';
import { PropertyCard } from '@/components/property/property-card';
import { Skeleton } from '@/components/ui/feedback';
import { safeBrowserRequest } from '@/lib/api/browser';
import { isApiError } from '@/lib/api/error';
import { useFavoritesStore } from '@/lib/favorites/store';
import type { PropertyCard as PropertyCardType } from '@/lib/api/types';

type Status = 'loading' | 'ready' | 'error' | 'unauthorized';

const PAGE_SIZE = 24;
const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const [cards, setCards] = useState<PropertyCardType[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const savedIds = useFavoritesStore((state) => state.savedIds);
  const seed = useFavoritesStore((state) => state.seed);

  const load = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setStatus('loading');
      }
      setError(null);

      const result = await safeBrowserRequest<PropertyCardType[]>('/favorites', {
        query: { page: pageToLoad, limit: PAGE_SIZE },
      });

      if (result.ok) {
        setCards((previous) => {
          if (!append) {
            return result.data;
          }
          // Append without duplicates in case the ordering shifted between pages.
          const seen = new Set(previous.map((card) => card.id));
          return [...previous, ...result.data.filter((card) => !seen.has(card.id))];
        });
        // Feed the shared store so hearts everywhere match this list.
        seed(result.data.map((card) => card.id));
        setHasNextPage(Boolean(result.meta.hasNextPage));
        setPage(pageToLoad);
        setStatus('ready');
        setLoadingMore(false);
        return;
      }

      if (isApiError(result.error) && result.error.isAuth) {
        setStatus('unauthorized');
        setLoadingMore(false);
        return;
      }

      setError(result.error.message);
      setStatus('error');
      setLoadingMore(false);
    },
    [seed],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  // Removing a favourite on any card updates the store, which filters this list.
  const visible = status === 'ready' ? cards.filter((card) => savedIds.has(card.id)) : [];

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Saved Properties
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Quickly review and compare the properties you bookmarked.
        </p>
      </div>

      {status === 'loading' && (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading saved properties"
        >
          {SKELETON_KEYS.map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <h2 className="text-base font-semibold text-foreground">Could not load saved properties</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load(1, false)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </button>
        </div>
      )}

      {status === 'unauthorized' && (
        <div className="mx-auto my-12 max-w-md rounded-2xl border border-dashed p-12 text-center">
          <LogIn className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Sign in to see your saved properties</h2>
          <p className="mt-1 mb-6 text-xs leading-relaxed text-muted-foreground">
            Your favourites are tied to your account and stay available across devices.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Sign In
          </Link>
        </div>
      )}

      {status === 'ready' && visible.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((property) => (
              <PropertyCard key={property.id} property={property} isFavorited />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => void load(page + 1, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-70"
              >
                {loadingMore ? 'Loading...' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}

      {status === 'ready' && visible.length === 0 && (
        <div className="mx-auto my-12 max-w-md rounded-2xl border border-dashed p-12 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">No saved properties yet</h2>
          <p className="mt-1 mb-6 text-xs leading-relaxed text-muted-foreground">
            When you see a PG, room or flat you like, tap the heart icon to save it here for quick
            access.
          </p>
          <Link
            href="/search"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Browse Available Rentals
          </Link>
        </div>
      )}
    </main>
  );
}
