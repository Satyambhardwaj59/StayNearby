import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building,
  Building2,
  DoorOpen,
  Users,
  BedDouble,
  Home,
  MapPin,
  Search,
  Heart,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PropertyCard } from '@/components/property/property-card';
import { request } from '@/lib/api/fetcher';
import { buildMetadata, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/metadata';
import { graph, organizationSchema, propertyCardsItemList, websiteSchema } from '@/lib/seo/structured-data';
import type { PropertyCard as PropertyCardType } from '@/lib/api/types';

const HOME_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
const HOME_DESCRIPTION =
  'Find PGs, rooms, flats and houses near your preferred location. Filter by city, property type and monthly budget, and contact owners directly.';

export const metadata: Metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
  }),
  // The root title template appends the brand suffix, so the home page sets an
  // absolute title to avoid repeating "StayNearby" twice.
  title: { absolute: HOME_TITLE },
};

const PROPERTY_TYPES = [
  { type: 'PG', label: 'Paying guest', hint: 'Shared homes with food plans', icon: Building2 },
  { type: 'ROOM', label: 'Single room', hint: 'Private room in a shared home', icon: DoorOpen },
  { type: 'FLAT', label: 'Flat', hint: '1, 2 and 3 BHK family flats', icon: Building },
  { type: 'CO_LIVING', label: 'Co-living', hint: 'Managed shared apartments', icon: Users },
  { type: 'HOSTEL', label: 'Hostel', hint: 'Shared rooms for students', icon: BedDouble },
  { type: 'HOUSE', label: 'Independent house', hint: 'Whole-house rentals', icon: Home },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget' },
  { value: '8000', label: 'Up to ₹8,000 / month' },
  { value: '15000', label: 'Up to ₹15,000 / month' },
  { value: '25000', label: 'Up to ₹25,000 / month' },
  { value: '40000', label: 'Up to ₹40,000 / month' },
  { value: '60000', label: 'Up to ₹60,000 / month' },
];

const POPULAR_CITIES = [
  { name: 'Bangalore', slug: 'bangalore' },
  { name: 'Mumbai', slug: 'mumbai' },
  { name: 'Delhi-NCR', slug: 'delhi' },
  { name: 'Pune', slug: 'pune' },
  { name: 'Hyderabad', slug: 'hyderabad' },
];

const STEPS = [
  {
    icon: Search,
    title: 'Search where you want to live',
    body: 'Start with a city or locality, then narrow by property type, budget and furnishing.',
  },
  {
    icon: Heart,
    title: 'Save the homes worth a visit',
    body: 'Shortlist listings to your account and compare rent, deposit and amenities side by side.',
  },
  {
    icon: MessageSquare,
    title: 'Contact the owner directly',
    body: 'Request a visit or message the owner from the listing — no middlemen in between.',
  },
];

async function getLatestListings(): Promise<PropertyCardType[]> {
  const result = await request<PropertyCardType[]>('/search', {
    query: { limit: 3, sort: 'newest' },
    // Public, identical for every visitor — safe to cache and revalidate.
    next: { revalidate: 300 },
  }).catch(() => null);
  return result?.data ?? [];
}

export default async function HomePage() {
  const listings = await getLatestListings();
  const structuredData = graph([
    organizationSchema(),
    websiteSchema(),
    ...(listings.length > 0 ? [propertyCardsItemList(listings, '/')] : []),
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero: a single, focused search task. */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-h1 font-bold text-foreground sm:text-4xl md:text-[2.75rem]">
              Find Your Next Home, Closer Than You Think.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Discover PGs, rooms, flats and homes in your preferred area, and find a place that
              fits your budget and lifestyle.
            </p>

            <form
              action="/search"
              method="GET"
              className="mt-8 rounded-2xl border bg-card p-4 shadow-card sm:p-5"
              role="search"
              aria-label="Search rentals"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-city" className="text-xs font-medium text-muted-foreground">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      id="hero-city"
                      type="text"
                      name="city"
                      placeholder="City or locality"
                      autoComplete="address-level2"
                      className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-type" className="text-xs font-medium text-muted-foreground">
                    Property type
                  </label>
                  <select
                    id="hero-type"
                    name="type"
                    defaultValue=""
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <option value="">Any type</option>
                    {PROPERTY_TYPES.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-budget" className="text-xs font-medium text-muted-foreground">
                    Monthly budget
                  </label>
                  <select
                    id="hero-budget"
                    name="maxRent"
                    defaultValue=""
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {BUDGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* Spacer label keeps the button aligned with the inputs. */}
                  <span aria-hidden className="hidden text-xs font-medium text-muted-foreground md:block">
                    &nbsp;
                  </span>
                  <button
                    type="submit"
                    className={buttonVariants({ size: 'lg', className: 'h-11 gap-2 md:w-auto' })}
                  >
                    <Search className="h-4 w-4" aria-hidden /> Search
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {PROPERTY_TYPES.slice(0, 4).map((item) => (
                <Link
                  key={item.type}
                  href={`/search?type=${item.type}`}
                  className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Browse by property type */}
      <section className="border-b py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Browse by property type
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the kind of home you are looking for.
              </p>
            </div>
            <Link
              href="/search"
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Browse all rentals
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTY_TYPES.map(({ type, label, hint, icon: Icon }) => (
              <Link
                key={type}
                href={`/search?type=${type}`}
                className="group flex items-start gap-4 rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {label}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Popular cities
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => (
                <Link
                  key={city.slug}
                  href={`/city/${city.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recently listed properties from the live API */}
      <section className="border-b py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Recently listed rentals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The newest homes published by owners on StayNearby.
              </p>
            </div>
            <Link
              href="/search?sort=newest"
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              See all new listings
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" aria-hidden />
              <h3 className="text-base font-semibold text-foreground">
                New listings will appear here
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Owners publish new PGs, rooms and flats regularly. Search by your city or locality
                to see what is available right now.
              </p>
              <Link
                href="/search"
                className={buttonVariants({ className: 'mt-5' })}
              >
                Search rentals
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works — describes functionality that actually exists */}
      <section className="border-b bg-muted/20 py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              How StayNearby works
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three steps from searching to speaking with the owner.
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="rounded-xl border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border bg-card p-8 shadow-card md:flex-row md:items-center md:p-10">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Have a room, flat or PG to rent out?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Publish your listing, add photos and details, and start receiving visit requests
                from people searching in your area.
              </p>
            </div>
            <Link
              href="/dashboard/properties/new"
              className={buttonVariants({ size: 'lg', className: 'shrink-0 gap-2' })}
            >
              Post your listing <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
