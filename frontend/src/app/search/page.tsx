import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Building2, X } from 'lucide-react';
import { PropertyCard } from '@/components/property/property-card';
import { PropertyFilters } from '@/components/property/property-filters';
import { SortSelect } from '@/components/property/sort-select';
import { buttonVariants } from '@/components/ui/button';
import { safeServerRequest } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { buildMetadata } from '@/lib/seo/metadata';
import { pluralise } from '@/lib/format';
import type { PropertyCard as PropertyCardType } from '@/lib/api/types';

export const metadata: Metadata = buildMetadata({
  title: 'Search rentals — PGs, rooms, flats and houses',
  description:
    'Search and filter PGs, rooms, flats, apartments and co-living rentals by city, locality, budget, property type and furnishing.',
  path: '/search',
});

const PAGE_SIZE = 24;

const TYPE_LABELS: Record<string, string> = {
  PG: 'PG',
  ROOM: 'Room',
  FLAT: 'Flat',
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  HOSTEL: 'Hostel',
  CO_LIVING: 'Co-living',
  INDEPENDENT_HOUSE: 'Independent house',
};
const BHK_LABELS: Record<string, string> = {
  RK: '1 RK',
  '1_BHK': '1 BHK',
  '2_BHK': '2 BHK',
  '3_BHK': '3 BHK',
  '4_BHK': '4 BHK',
  '5_PLUS_BHK': '5+ BHK',
};
const FURNISHING_LABELS: Record<string, string> = {
  UNFURNISHED: 'Unfurnished',
  SEMI_FURNISHED: 'Semi furnished',
  FULLY_FURNISHED: 'Fully furnished',
};
const TENANT_LABELS: Record<string, string> = {
  BACHELOR: 'Bachelors',
  STUDENT: 'Students',
  FAMILY: 'Families',
  COUPLE: 'Couples',
  WORKING_PROFESSIONAL: 'Working professionals',
  FEMALE: 'Female tenants',
  MALE: 'Male tenants',
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const city = single(resolved.city);
  const locality = single(resolved.locality);
  const type = single(resolved.type);
  const bhk = single(resolved.bhk);
  const furnishing = single(resolved.furnishing);
  const tenantType = single(resolved.tenantType);
  const minRent = single(resolved.minRent);
  const maxRent = single(resolved.maxRent);
  const sort = single(resolved.sort) || 'newest';
  const page = Math.max(1, Number.parseInt(single(resolved.page) || '1', 10) || 1);

  const query = new URLSearchParams();
  if (city) query.set('city', city);
  if (locality) query.set('locality', locality);
  if (type) query.set('type', type);
  if (bhk) query.set('bhk', bhk);
  if (furnishing) query.set('furnishing', furnishing);
  if (tenantType) query.set('tenantType', tenantType);
  if (minRent) query.set('minRent', minRent);
  if (maxRent) query.set('maxRent', maxRent);
  query.set('sort', sort);
  query.set('page', String(page));
  query.set('limit', String(PAGE_SIZE));

  const res = await safeServerRequest<PropertyCardType[]>(`${endpoints.search}?${query.toString()}`);
  const items = res.ok && Array.isArray(res.data) ? res.data : [];
  const loadError = res.ok ? null : res.error.message;
  const total = res.ok ? (res.meta.total ?? items.length) : 0;
  const totalPages = res.ok ? (res.meta.totalPages ?? Math.ceil(total / PAGE_SIZE)) : 1;

  const locationTitle = locality ? `${locality}, ${city || 'India'}` : city || 'India';

  // Active filters as removable chips; each link keeps every other parameter.
  const chips: Array<{ key: string; label: string }> = [];
  if (city) chips.push({ key: 'city', label: city });
  if (locality) chips.push({ key: 'locality', label: locality });
  if (type) chips.push({ key: 'type', label: TYPE_LABELS[type] ?? type });
  if (bhk) chips.push({ key: 'bhk', label: BHK_LABELS[bhk] ?? bhk });
  if (furnishing) chips.push({ key: 'furnishing', label: FURNISHING_LABELS[furnishing] ?? furnishing });
  if (tenantType) chips.push({ key: 'tenantType', label: TENANT_LABELS[tenantType] ?? tenantType });
  if (minRent) chips.push({ key: 'minRent', label: `From ₹${Number(minRent).toLocaleString('en-IN')}` });
  if (maxRent) chips.push({ key: 'maxRent', label: `Up to ₹${Number(maxRent).toLocaleString('en-IN')}` });

  const hrefWithout = (drop: string) => {
    const params = new URLSearchParams(query.toString());
    params.delete(drop);
    params.delete('page');
    return `/search?${params.toString()}`;
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">Search rentals</span>
        {city && (
          <>
            <span aria-hidden>/</span>
            <span className="font-medium capitalize text-foreground">{city}</span>
          </>
        )}
      </nav>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-h2 font-bold text-foreground">Rentals in {locationTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {loadError
              ? 'Listings are temporarily unavailable.'
              : total > 0
                ? `${pluralise(total, 'property', 'properties')} found`
                : 'No properties match your search yet'}
          </p>
        </div>
        <SortSelect value={sort} />
      </div>

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={hrefWithout(chip.key)}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <span className="capitalize">{chip.label}</span>
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">Remove {chip.label} filter</span>
            </Link>
          ))}
          <Link
            href="/search"
            className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Clear all
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="sticky sticky-under-header">
            <Suspense
              fallback={
                <div className="h-[34rem] rounded-xl border bg-card p-5 shadow-card">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              }
            >
              <PropertyFilters />
            </Suspense>
          </div>
        </aside>

        <section aria-label="Search results" className="lg:col-span-3">
          {loadError && (
            <div role="alert" className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">Could not load listings</p>
              <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
            </div>
          )}

          {items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex items-center justify-between gap-4"
                >
                  {page > 1 ? (
                    <Link
                      href={`/search?${(() => {
                        const params = new URLSearchParams(query.toString());
                        params.set('page', String(page - 1));
                        return params.toString();
                      })()}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={`/search?${(() => {
                        const params = new URLSearchParams(query.toString());
                        params.set('page', String(page + 1));
                        return params.toString();
                      })()}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          ) : (
            !loadError && (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="text-base font-semibold text-foreground">No properties found</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Try a different city or locality, widen your budget, or remove some filters.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {chips.length > 0 && (
                    <Link href="/search" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      Clear all filters
                    </Link>
                  )}
                  <Link href="/search?sort=newest" className={buttonVariants({ size: 'sm' })}>
                    Browse newest listings
                  </Link>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </main>
  );
}
