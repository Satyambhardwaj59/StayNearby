import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  MapPin,
  ShieldCheck,
  Calendar,
  Check,
  Mail,
  Home,
  Layers,
  Bed,
  Bath,
  Maximize2,
  Info,
} from 'lucide-react';
import { PropertyCard } from '@/components/property/property-card';
import { PropertyReviews } from '@/components/property/property-reviews';
import { FavoriteButton } from '@/components/property/favorite-button';
import { safeServerRequest } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import {
  formatRent,
  furnishingLabel,
  propertyTypeLabel,
  amenityLabel,
  tenantPreferenceLabel,
  formatDate,
} from '@/lib/format';
import { buildMetadata, SITE_NAME } from '@/lib/seo/metadata';
import { graph, propertySchema } from '@/lib/seo/structured-data';
import type { AvailabilityStatus } from '@/lib/api/types';
import type { PropertyDetailResponse } from '@/lib/api/types';

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'Available now',
  OCCUPIED: 'Currently occupied',
  ON_HOLD: 'Temporarily on hold',
};

export async function generateMetadata({ params }: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await safeServerRequest<PropertyDetailResponse>(endpoints.propertyBySlug(slug));

  if (res.ok && res.data?.property) {
    const p = res.data.property;
    return buildMetadata({
      title: `${p.title} — ${p.location.locality}, ${p.location.city}`,
      description: p.description.slice(0, 160),
      path: `/properties/${slug}`,
    });
  }

  return buildMetadata({
    title: 'Rental property details',
    description: 'Specifications, photos, rent breakdown and amenities for this rental listing.',
    path: `/properties/${slug}`,
  });
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { slug } = await params;
  const res = await safeServerRequest<PropertyDetailResponse>(endpoints.propertyBySlug(slug));

  // Fail loudly instead of rendering fabricated demo content.
  if (!res.ok || !res.data?.property) {
    notFound();
  }

  const { property, isFavorited } = res.data;
  const related = res.data.related ?? [];

  const brokerageLabel = property.brokerageApplicable
    ? `${formatRent(property.brokerage ?? 0)} brokerage`
    : 'No brokerage';
  const maintenanceLabel =
    property.maintenance && property.maintenance > 0
      ? property.maintenanceIncluded
        ? `${formatRent(property.maintenance)} maintenance (included)`
        : `${formatRent(property.maintenance)} maintenance`
      : property.maintenanceIncluded
        ? 'Maintenance included'
        : null;

  const tenantLabel =
    property.tenantPreferences.length > 0
      ? property.tenantPreferences.map(tenantPreferenceLabel).join(', ')
      : 'Open to anyone';

  const structuredData = graph([propertySchema(property)]);

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/city/${property.citySlug}`} className="capitalize transition-colors hover:text-foreground">
          {property.location.city}
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/city/${property.citySlug}/${property.localitySlug}`}
          className="transition-colors hover:text-foreground"
        >
          {property.location.locality}
        </Link>
        <span aria-hidden>/</span>
        <span className="max-w-xs truncate font-medium text-foreground">{property.title}</span>
      </nav>

      {/* Gallery: stable heights reserve space before images load (no CLS). */}
      <section className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted md:col-span-2 md:aspect-auto md:h-[420px]">
          {property.images[0] ? (
            <Image
              src={property.images[0].url}
              alt={property.images[0].alt || property.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <Home className="h-10 w-10" aria-hidden />
            </span>
          )}
        </div>
        {property.images.length > 1 && (
          <div className="hidden grid-cols-2 gap-3 md:col-span-2 md:grid md:h-[420px]">
            {property.images.slice(1, 5).map((img, idx) => (
              <div key={img.url} className="relative overflow-hidden rounded-xl bg-muted">
                <Image
                  src={img.url}
                  alt={img.alt || `Photo ${idx + 2} of ${property.title}`}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-primary">
                {propertyTypeLabel(property.propertyType)}
              </span>
              {property.verificationStatus === 'VERIFIED' && (
                <span className="flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-2xs font-medium text-success-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Verified listing
                </span>
              )}
            </div>

            <h1 className="text-h1 font-bold text-foreground">{property.title}</h1>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                {property.location.locality}, {property.location.city}, {property.location.state}
              </span>
            </p>
          </header>

          {/* Key facts */}
          <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-5 shadow-card sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Monthly rent</dt>
              <dd className="mt-0.5 text-lg font-bold text-foreground">
                {formatRent(property.rent)}
                <span className="text-xs font-normal text-muted-foreground"> /mo</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Deposit</dt>
              <dd className="mt-0.5 text-lg font-bold text-foreground">
                {formatRent(property.securityDeposit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Furnishing</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {furnishingLabel(property.furnishing)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Availability</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {AVAILABILITY_LABELS[property.availabilityStatus]}
                {property.availableFrom && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    from {formatDate(property.availableFrom)}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {/* Costs — only facts the listing provides */}
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Costs & terms</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <li className="flex items-start gap-2 text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                {brokerageLabel}
              </li>
              {maintenanceLabel && (
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  {maintenanceLabel}
                </li>
              )}
              <li className="flex items-start gap-2 text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                Suitable for {tenantLabel}
              </li>
            </ul>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Specifications</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {property.bedrooms !== null && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <Bed className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>{property.bedrooms} bedrooms</span>
                </div>
              )}
              {property.bathrooms !== null && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <Bath className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>{property.bathrooms} bathrooms</span>
                </div>
              )}
              {property.area !== null && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>
                    {property.area} {property.areaUnit}
                  </span>
                </div>
              )}
              {property.floor !== null && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>
                    Floor {property.floor}
                    {property.totalFloors ? ` of ${property.totalFloors}` : ''}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">About this property</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {property.description}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Amenities</h2>
            {property.amenities.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{amenityLabel(amenity)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                The owner has not listed amenities yet.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Location</h2>
            <div className="space-y-2 rounded-xl border bg-muted/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                {property.location.locality}, {property.location.city}
              </p>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {property.location.precision === 'EXACT'
                  ? 'The full address is shown because the owner shares an exact location.'
                  : 'The exact address is shared by the owner after you request a visit.'}
              </p>
            </div>
          </section>

          <PropertyReviews propertyId={property.id} />
        </div>

        {/* Contact / action card */}
        <div className="lg:col-span-1">
          <div className="sticky sticky-under-header space-y-5 rounded-2xl border bg-card p-6 shadow-card">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly rent
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{formatRent(property.rent)}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {brokerageLabel}
                {property.securityDeposit > 0 && ` · ${formatRent(property.securityDeposit)} deposit`}
              </p>
            </div>

            <div className="space-y-3 border-t pt-5">
              <Link
                href={`/dashboard/visits?propertyId=${property.id}&action=schedule`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Request a visit
              </Link>

              <Link
                href={`/dashboard/messages?propertyId=${property.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Message the owner
              </Link>

              <FavoriteButton propertyId={property.id} initialFavorited={isFavorited} />
            </div>

            <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              Listing ID: <span className="font-mono text-foreground/70">{property.id}</span>
              <br />
              {SITE_NAME} shows contact details only to signed-in users to protect owners from spam.
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t pt-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
            More rentals in {property.location.city}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((card) => (
              <PropertyCard key={card.id} property={card} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
