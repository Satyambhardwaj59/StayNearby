'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CITIES = [
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Pune',
  'Hyderabad',
  'Gurgaon',
  'Noida',
  'Chennai',
];

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'PG', label: 'PG / Paying Guest' },
  { value: 'ROOM', label: 'Single Room' },
  { value: 'FLAT', label: 'Flat' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'CO_LIVING', label: 'Co-living' },
];

const BHK_OPTIONS = [
  { value: '', label: 'Any BHK' },
  { value: 'RK', label: '1 RK' },
  { value: '1_BHK', label: '1 BHK' },
  { value: '2_BHK', label: '2 BHK' },
  { value: '3_BHK', label: '3 BHK' },
  { value: '4_BHK', label: '4+ BHK' },
];

const FURNISHING_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'UNFURNISHED', label: 'Unfurnished' },
  { value: 'SEMI_FURNISHED', label: 'Semi Furnished' },
  { value: 'FULLY_FURNISHED', label: 'Fully Furnished' },
];

const TENANT_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'BACHELOR', label: 'Bachelors' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'FAMILY', label: 'Families' },
  { value: 'COUPLE', label: 'Couples' },
  { value: 'FEMALE', label: 'Female Only' },
];

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [locality, setLocality] = useState(searchParams.get('locality') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [bhk, setBhk] = useState(searchParams.get('bhk') || '');
  const [furnishing, setFurnishing] = useState(searchParams.get('furnishing') || '');
  const [tenantType, setTenantType] = useState(searchParams.get('tenantType') || '');
  const [minRent, setMinRent] = useState(searchParams.get('minRent') || '');
  const [maxRent, setMaxRent] = useState(searchParams.get('maxRent') || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (locality) params.set('locality', locality);
    if (type) params.set('type', type);
    if (bhk) params.set('bhk', bhk);
    if (furnishing) params.set('furnishing', furnishing);
    if (tenantType) params.set('tenantType', tenantType);
    if (minRent) params.set('minRent', minRent);
    if (maxRent) params.set('maxRent', maxRent);
    // Preserve the chosen sort order when applying filters.
    const sort = searchParams.get('sort');
    if (sort && sort !== 'newest') params.set('sort', sort);

    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/search?${queryString}` : '/search');
    });
  };

  const resetFilters = () => {
    setCity('');
    setLocality('');
    setType('');
    setBhk('');
    setFurnishing('');
    setTenantType('');
    setMinRent('');
    setMaxRent('');
    startTransition(() => {
      router.push('/search');
    });
  };

  return (
    <div className="space-y-6 rounded-xl border bg-card p-5 text-card-foreground shadow-card">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" aria-hidden />
          <span>Filters</span>
        </h2>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* City & Locality */}
      <div className="space-y-3">
        <div>
          <label
            htmlFor="filter-city"
            className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5"
          >
            City
          </label>
          <select
            id="filter-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-locality"
            className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5"
          >
            Locality / Area
          </label>
          <input
            id="filter-locality"
            type="text"
            placeholder="e.g. Koramangala, Indiranagar"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-2">
          Property Type
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setType(type === pt.value ? '' : pt.value)}
              aria-pressed={type === pt.value}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
                type === pt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* BHK Bedrooms */}
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-2">
          BHK / Sharing
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {BHK_OPTIONS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setBhk(bhk === b.value ? '' : b.value)}
              aria-pressed={bhk === b.value}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium text-center transition-colors ${
                bhk === b.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Budget Range */}
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-2">
          Rent Range (₹ / month)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Furnishing */}
      <div>
        <label
          htmlFor="filter-furnishing"
          className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5"
        >
          Furnishing
        </label>
        <select
          id="filter-furnishing"
          value={furnishing}
          onChange={(e) => setFurnishing(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {FURNISHING_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tenant Preference */}
      <div>
        <label
          htmlFor="filter-tenant"
          className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5"
        >
          Tenant Preference
        </label>
        <select
          id="filter-tenant"
          value={tenantType}
          onChange={(e) => setTenantType(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {TENANT_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action */}
      <Button
        type="button"
        onClick={applyFilters}
        disabled={isPending}
        className="w-full gap-2 shadow-sm font-semibold"
      >
        <Search className="h-4 w-4" />
        {isPending ? 'Applying...' : 'Apply Filters'}
      </Button>
    </div>
  );
}
