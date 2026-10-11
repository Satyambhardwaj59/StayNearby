'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, Heart, MapPin, ShieldCheck } from 'lucide-react';
import {
  formatRent,
  propertyTypeLabel,
  furnishingLabel,
  bhkLabel,
  roomTypeLabel,
  formatDate,
} from '@/lib/format';
import { useFavoritesStore } from '@/lib/favorites/store';
import { cn } from '@/lib/cn';
import type { PropertyCard as PropertyCardType, Property } from '@/lib/api/types';

interface PropertyCardProps {
  property: PropertyCardType | (Property & { isFavorited?: boolean });
  /** Server-rendered saved state, used until the shared store hydrates. */
  isFavorited?: boolean;
  /** Optional override; the shared store is used by default. */
  onToggleFavorite?: (id: string) => void;
}

function resolveImage(property: PropertyCardProps['property']): { url: string; alt: string } | null {
  if ('image' in property) {
    return property.image;
  }
  const cover = property.images.find((img) => img.isCover) ?? property.images[0];
  return cover ? { url: cover.url, alt: cover.alt || property.title } : null;
}

export function PropertyCard({ property, isFavorited, onToggleFavorite }: PropertyCardProps) {
  const propertyId = property.id;

  const savedInStore = useFavoritesStore((state) => state.savedIds.has(propertyId));
  const hydrated = useFavoritesStore((state) => state.status === 'ready');
  const pending = useFavoritesStore((state) => state.pending.has(propertyId));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const hydrate = useFavoritesStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const serverValue =
    isFavorited ?? ('isFavorited' in property ? Boolean(property.isFavorited) : false);
  const favorited = hydrated ? savedInStore : serverValue;

  const image = resolveImage(property);
  const verified =
    'verified' in property ? property.verified : property.verificationStatus === 'VERIFIED';
  const deposit = 'deposit' in property ? property.deposit : property.securityDeposit;
  const roomType = 'roomType' in property ? property.roomType : null;
  const availableFrom = 'availableFrom' in property ? property.availableFrom : null;

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void toggleFavorite(propertyId);
    onToggleFavorite?.(propertyId);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-card transition-all duration-200 hover:border-primary/40 hover:shadow-cardHover">
      {/* Fixed aspect ratio reserves the image box before it loads (no CLS). */}
      <Link
        href={`/properties/${property.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-muted"
        aria-label={`View ${property.title}`}
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <Building2 className="h-10 w-10" aria-hidden />
          </span>
        )}

        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-background/90 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
            {propertyTypeLabel(property.propertyType)}
          </span>
          {verified && (
            <span className="flex items-center gap-1 rounded-md bg-success px-2 py-0.5 text-2xs font-semibold text-success-foreground shadow-sm">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
            </span>
          )}
        </span>
      </Link>

      {/* Favourite control sits outside the link so it stays independently keyboard reachable. */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={favorited ? `Remove ${property.title} from saved` : `Save ${property.title}`}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-transform duration-150 hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95 disabled:opacity-70"
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            favorited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground',
          )}
          aria-hidden
        />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {formatRent(property.rent)}
          </span>
          <span className="text-xs text-muted-foreground">/ month</span>
          {deposit > 0 && (
            <span className="ml-auto text-2xs text-muted-foreground">
              {formatRent(deposit)} deposit
            </span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-1 font-semibold text-foreground">
          <Link href={`/properties/${property.slug}`} className="transition-colors hover:text-primary">
            {property.title}
          </Link>
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-1">
            {property.location.locality}, {property.location.city}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
          {property.bhk && (
            <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground/80">
              {bhkLabel(property.bhk)}
            </span>
          )}
          {!property.bhk && roomType && (
            <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground/80">
              {roomTypeLabel(roomType)}
            </span>
          )}
          {property.furnishing && (
            <span className="rounded bg-muted px-2 py-0.5">{furnishingLabel(property.furnishing)}</span>
          )}
        </div>

        {/* Availability is only shown when the listing actually provides a date. */}
        {availableFrom && (
          <p className="mt-3 border-t pt-2.5 text-2xs font-medium text-success">
            Available from {formatDate(availableFrom)}
          </p>
        )}
      </div>
    </article>
  );
}
