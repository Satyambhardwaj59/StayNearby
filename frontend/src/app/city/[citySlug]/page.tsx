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

interface CityPageProps {
  params: Promise<{ citySlug: string }>;
}

/**
 * Widely-known localities per city, used as quick links. Nothing is invented for
 * cities we do not have curated data for — the section is simply omitted.
 */
const CITY_POPULAR_LOCALITIES: Record<string, string[]> = {
  bangalore: ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Electronic City', 'Bellandur', 'Marathahalli', 'BTM Layout'],
  mumbai: ['Andheri West', 'Powai', 'Bandra', 'Thane', 'Goregaon', 'Malad', 'Navi Mumbai', 'Worli'],
  delhi: ['Kamla Nagar', 'Hauz Khas', 'Saket', 'Lajpat Nagar', 'Dwarka', 'Rohini'],
  pune: ['Hinjewadi', 'Kothrud', 'Viman Nagar', 'Wakad', 'Baner', 'Kalyani Nagar', 'Magarpatta', 'Aundh'],
  hyderabad: ['HITEC City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Jubilee Hills', 'Banjara Hills', 'Ameerpet'],
};

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const cityName = titleCase(citySlug);

  return buildMetadata({
    title: `Rentals, flats and PGs in ${cityName}`,
    description: `Find PGs, single rooms, flats and co-living spaces for rent across popular localities in ${cityName}. Filter by budget, property type and furnishing.`,
    path: `/city/${citySlug}`,
  });
}

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const cityName = titleCase(citySlug);
  const localities = CITY_POPULAR_LOCALITIES[citySlug.toLowerCase()] ?? [];

  const res = await safeServerRequest<PropertyCardType[]>(
    `${endpoints.search}?city=${citySlug}&limit=12`,
  );
  const properties = res.ok && Array.isArray(res.data) ? res.data : [];

  const typeLinks = [
    { href: `/search?city=${citySlug}&type=PG`, label: `PGs in ${cityName}` },
    { href: `/search?city=${citySlug}&type=FLAT`, label: `Flats in ${cityName}` },
    { href: `/search?city=${citySlug}&type=CO_LIVING`, label: `Co-living in ${cityName}` },
    { href: `/search?city=${citySlug}&type=ROOM`, label: `Single rooms in ${cityName}` },
  ];

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{cityName}</span>
      </nav>

      <section className="mb-10 rounded-2xl border bg-card p-8 shadow-card md:p-12">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> City guide
          </span>
          <h1 className="text-h1 font-bold text-foreground md:text-4xl">
            Rentals, flats and PGs in {cityName}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Browse homes listed by owners across {cityName}. Compare rent, deposit and furnishing,
            then contact the owner directly to arrange a visit.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {typeLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border bg-background px-4 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {localities.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground">
            Popular localities in {cityName}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {localities.map((loc) => {
              const locSlug = loc.toLowerCase().replace(/\s+/g, '-');
              return (
                <Link
                  key={loc}
                  href={`/city/${citySlug}/${locSlug}`}
                  className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {loc}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Explore rentals</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {properties.length > 0
              ? `${pluralise(properties.length, 'home')} in ${cityName}`
              : `Rentals in ${cityName}`}
          </h2>
          <Link
            href={`/search?city=${citySlug}`}
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
              No listings in {cityName} yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              New properties appear here as soon as owners publish them.
            </p>
            <Link href="/dashboard/properties/new" className={buttonVariants({ className: 'mt-4', size: 'sm' })}>
              Post a listing
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
