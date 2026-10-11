import Link from 'next/link';
import { BrandLockup } from '@/components/layout/brand-mark';
import { SITE_TAGLINE } from '@/lib/seo/metadata';

const EXPLORE_LINKS = [
  { href: '/search?type=PG', label: 'Paying guest (PG)' },
  { href: '/search?type=ROOM', label: 'Single rooms' },
  { href: '/search?type=FLAT', label: 'Flats & apartments' },
  { href: '/search?type=CO_LIVING', label: 'Co-living spaces' },
  { href: '/search?type=HOSTEL', label: 'Student hostels' },
];

const CITY_LINKS = [
  { href: '/city/bangalore', label: 'Bangalore' },
  { href: '/city/mumbai', label: 'Mumbai' },
  { href: '/city/delhi', label: 'Delhi-NCR' },
  { href: '/city/pune', label: 'Pune' },
  { href: '/city/hyderabad', label: 'Hyderabad' },
];

const OWNER_LINKS = [
  { href: '/dashboard/properties/new', label: 'Post a free listing' },
  { href: '/dashboard/properties', label: 'Owner dashboard' },
  { href: '/register?role=OWNER', label: 'Owner sign up' },
  { href: '/login', label: 'Sign in' },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 text-sm text-muted-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-4 md:col-span-1">
            <Link href="/" aria-label="StayNearby home">
              <BrandLockup />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              Find PGs, rooms, flats and houses near your preferred location.
            </p>
            <p className="text-xs font-medium text-foreground">{SITE_TAGLINE}</p>
          </div>

          <nav aria-label="Explore rentals" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Explore</p>
            <ul className="space-y-2">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Rental cities" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Cities</p>
            <ul className="space-y-2">
              {CITY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="For property owners" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              For owners
            </p>
            <ul className="space-y-2">
              {OWNER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} StayNearby. All rights reserved.</p>
          <p className="text-muted-foreground">
            Rentals across India · Listed by owners and verified partners
          </p>
        </div>
      </div>
    </footer>
  );
}
