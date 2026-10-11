'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/lib/favorites/store';
import { cn } from '@/lib/cn';

interface FavoriteButtonProps {
  propertyId: string;
  initialFavorited: boolean;
}

/**
 * Full-width save control for the property detail page. Reads the shared store
 * so it stays in sync with every card on the site, falling back to the
 * server-rendered value until the store has hydrated.
 */
export function FavoriteButton({ propertyId, initialFavorited }: FavoriteButtonProps) {
  const savedInStore = useFavoritesStore((state) => state.savedIds.has(propertyId));
  const hydrated = useFavoritesStore((state) => state.status === 'ready');
  const pending = useFavoritesStore((state) => state.pending.has(propertyId));
  const toggle = useFavoritesStore((state) => state.toggle);
  const seed = useFavoritesStore((state) => state.seed);
  const hydrate = useFavoritesStore((state) => state.hydrate);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialFavorited) seed([propertyId]);
    void hydrate();
  }, [hydrate, initialFavorited, propertyId, seed]);

  const favorited = hydrated ? savedInStore : initialFavorited;

  const handleClick = async () => {
    setMessage(null);
    const nowSaved = await toggle(propertyId);
    setMessage(nowSaved ? 'Saved to your list' : 'Removed from your list');
    window.setTimeout(() => setMessage(null), 2500);
  };

  const error = useFavoritesStore((state) => state.lastError);

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending}
        aria-pressed={favorited}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition disabled:opacity-70',
          favorited
            ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'hover:bg-muted',
        )}
      >
        <Heart className={cn('h-4 w-4', favorited && 'fill-rose-500 text-rose-500')} aria-hidden />
        {favorited ? 'Saved' : 'Save Property'}
      </button>
      <p role="status" aria-live="polite" className="mt-2 min-h-[1rem] text-center text-xs text-muted-foreground">
        {message}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
