import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import { PropertyCard } from '@/components/property/property-card';
import { buttonVariants } from '@/components/ui/button';
import { safeServerRequest } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { titleCase, pluralise } from '@/lib/format';
import { buildMetadata } from '@/lib/seo/metadata';
import type { PropertyCard as PropertyCardType } from '@/lib/api/types';

interface LocalityPageProps {
  params: Promise<{ citySlug: string; localitySlug: string }>;
}

export async function generateMetadata({ params }: LocalityPageProps): Promise<Metadata> {
  const { citySlug, localitySlug } = await params;
  const cityName = titleCase(citySlug);
  const localityName = titleCase(localitySlug.replace(/-/g, ' '));

  return buildMetadata({
    title: `Rentals, PGs and flats in ${localityName}, ${cityName}`,
    description: `Discover PGs, single rooms, flats and co-living spaces for rent in ${localityName}, ${cityName}. Filter by rent, property type and furnishing.`,
    path: `/city/${citySlug}/${localitySlug}`,
  });
}

export default async function LocalityPage({ params }: LocalityPageProps) {
  const { citySlug, localitySlug } = await params;
  const cityName = titleCase(citySlug);
  const localityName = titleCase(localitySlug.replace(/-/g, ' '));

  const res = await safeServerRequest<PropertyCardType[]>(
    `${endpoints.search}?city=${citySlug}&locality=${localitySlug}&limit=12`,
  );
  const properties = res.ok && Array.isArray(res.data) ? res.data : [];

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/city/${citySlug}`} className="transition-colors hover:text-foreground">
          {cityName}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{localityName}</span>
      </nav>

      <section className="mb-8 space-y-3 rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <MapPin className="h-4 w-4" aria-hidden />
          Locality overview
        </p>
        <h1 className="text-h1 font-bold text-foreground md:text-4xl">
          Rentals in {localityName}, {cityName}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Browse homes for rent in {localityName}. Compare rent, deposit and amenities, then contact
          the owner directly to arrange a visit.
        </p>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {properties.length > 0
              ? `${pluralise(properties.length, 'home')} in ${localityName}`
              : `Homes in ${localityName}`}
          </h2>
          <Link
            href={`/search?city=${citySlug}&locality=${localitySlug}`}
            className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Filter and search
          </Link>
        </div>

        {properties.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-semibold text-foreground">
              No listings in {localityName} right now
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Try another locality in {cityName} or check back soon.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href={`/city/${citySlug}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Other {cityName} localities
              </Link>
              <Link href="/dashboard/properties/new" className={buttonVariants({ size: 'sm' })}>
                Post a listing
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
