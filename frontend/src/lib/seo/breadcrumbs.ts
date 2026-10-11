import type { Property } from '../api/types';
import { propertyTypeLabel } from '../format';

/** One breadcrumb model feeds both the visible trail and BreadcrumbList schema. */
export interface Breadcrumb {
  name: string;
  path: string;
}

export function homeBreadcrumb(): Breadcrumb {
  return { name: 'Home', path: '/' };
}

export function cityBreadcrumbs(city: { citySlug: string; city: string }): Breadcrumb[] {
  return [homeBreadcrumb(), { name: `Rentals in ${city.city}`, path: `/city/${city.citySlug}` }];
}

export function localityBreadcrumbs(
  city: { citySlug: string; city: string },
  locality: { localitySlug: string; locality: string },
): Breadcrumb[] {
  return [
    ...cityBreadcrumbs(city),
    {
      name: `Rentals in ${locality.locality}`,
      path: `/city/${city.citySlug}/${locality.localitySlug}`,
    },
  ];
}

export function propertyBreadcrumbs(property: Property): Breadcrumb[] {
  return [
    homeBreadcrumb(),
    { name: `Rentals in ${property.location.city}`, path: `/city/${property.citySlug}` },
    {
      name: `Rentals in ${property.location.locality}`,
      path: `/city/${property.citySlug}/${property.localitySlug}`,
    },
    {
      name: `${propertyTypeLabel(property.propertyType)} in ${property.location.locality}`,
      path: `/properties/${property.slug}`,
    },
  ];
}

export function searchBreadcrumbs(cityLabel?: string | null): Breadcrumb[] {
  const trail = [homeBreadcrumb(), { name: 'Search rentals', path: '/search' }];
  if (cityLabel) {
    trail.push({ name: cityLabel, path: '/search' });
  }
  return trail;
}

export function landingBreadcrumbs(landing: {
  citySlug: string;
  cityName: string;
  title: string;
}): Breadcrumb[] {
  return [
    homeBreadcrumb(),
    { name: `Rentals in ${landing.cityName}`, path: `/city/${landing.citySlug}` },
    { name: landing.title, path: '#' },
  ];
}
