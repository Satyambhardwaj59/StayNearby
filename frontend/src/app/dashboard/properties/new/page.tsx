'use client';
import { apiFetch } from '@/lib/api/client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  IndianRupee,
  Sparkles,
  Check,
  ArrowLeft,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AMENITIES_CATALOG } from '@/lib/format';

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('PG');
  const [bhk, setBhk] = useState('1_BHK');
  const [roomType, setRoomType] = useState('SINGLE');
  const [furnishing, setFurnishing] = useState('FULLY_FURNISHED');
  const [rent, setRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [maintenanceIncluded, setMaintenanceIncluded] = useState(true);
  const [city, setCity] = useState('Bangalore');
  const [locality, setLocality] = useState('');
  const [street, setStreet] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'WIFI',
    'POWER_BACKUP',
    'WATER_SUPPLY_24X7',
  ]);

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        propertyType,
        roomType: propertyType === 'PG' || propertyType === 'ROOM' ? roomType : undefined,
        bhk: propertyType === 'FLAT' || propertyType === 'APARTMENT' ? bhk : undefined,
        furnishing,
        rent: Number(rent),
        securityDeposit: Number(securityDeposit) || Number(rent),
        maintenance: maintenance ? Number(maintenance) : 0,
        maintenanceIncluded,
        description: description.trim(),
        address: {
          locality: locality.trim(),
          city: city.trim(),
          state: 'Karnataka',
          street: street.trim(),
        },
        location: {
          type: 'Point',
          coordinates: [77.6245, 12.9352], // Default coordinates
        },
        amenities: selectedAmenities,
        images: imageUrl
          ? [{ url: imageUrl.trim(), alt: title, isCover: true }]
          : [
              {
                url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
                alt: title,
                isCover: true,
              },
            ],
      };

      const res = await apiFetch('/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to create listing draft.');
      }

      router.push('/dashboard/properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Post Your Rental Property
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zero listing fees • Verified owner tags • Direct tenant leads
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border bg-card p-6 sm:p-8">
        {/* Step 1: Basic Information */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> 1. Property Details
          </h2>

          <div>
            <label htmlFor="field-listing-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Listing Title</label>
            <input id="field-listing-title"
              type="text"
              required
              minLength={10}
              placeholder="e.g. Spacious Luxury PG Room with 3 Meals & AC in Koramangala"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-property-type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Property Type</label>
              <select id="field-property-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="PG">Paying Guest (PG)</option>
                <option value="ROOM">Single Room</option>
                <option value="FLAT">Flat</option>
                <option value="APARTMENT">Apartment</option>
                <option value="CO_LIVING">Co-living</option>
                <option value="HOSTEL">Hostel</option>
                <option value="INDEPENDENT_HOUSE">Independent House</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-furnishing" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Furnishing</label>
              <select id="field-furnishing"
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="FULLY_FURNISHED">Fully Furnished</option>
                <option value="SEMI_FURNISHED">Semi Furnished</option>
                <option value="UNFURNISHED">Unfurnished</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-room-sharing-type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Room Sharing Type</label>
              <select id="field-room-sharing-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="SINGLE">Single Sharing</option>
                <option value="DOUBLE">Double Sharing</option>
                <option value="TRIPLE">Triple Sharing</option>
                <option value="FOUR_PLUS">4+ Sharing</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-bhk-configuration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">BHK Configuration</label>
              <select id="field-bhk-configuration"
                value={bhk}
                onChange={(e) => setBhk(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="RK">1 RK / Studio</option>
                <option value="1_BHK">1 BHK</option>
                <option value="2_BHK">2 BHK</option>
                <option value="3_BHK">3 BHK</option>
                <option value="4_BHK">4+ BHK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Pricing */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-600" /> 2. Pricing & Deposit
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-monthly-rent" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Monthly Rent (₹)</label>
              <input id="field-monthly-rent"
                type="number"
                required
                min={1000}
                placeholder="15000"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label htmlFor="field-security-deposit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Security Deposit (₹)</label>
              <input id="field-security-deposit"
                type="number"
                placeholder="30000"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-maintenance-mo" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Maintenance (₹ / mo)</label>
              <input id="field-maintenance-mo"
                type="number"
                placeholder="0"
                value={maintenance}
                onChange={(e) => setMaintenance(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="maintenanceIncluded"
                checked={maintenanceIncluded}
                onChange={(e) => setMaintenanceIncluded(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="maintenanceIncluded" className="text-xs font-medium text-foreground cursor-pointer">
                Maintenance included in monthly rent
              </label>
            </div>
          </div>
        </div>

        {/* Step 3: Location */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> 3. Location Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">City</label>
              <input id="field-city"
                type="text"
                required
                placeholder="Bangalore"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label htmlFor="field-locality-area" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Locality / Area</label>
              <input id="field-locality-area"
                type="text"
                required
                placeholder="e.g. Koramangala 4th Block"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="field-street-landmark" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Street / Landmark</label>
            <input id="field-street-landmark"
              type="text"
              placeholder="e.g. Near Sony World Signal"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {/* Step 4: Amenities */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> 4. Select Amenities
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AMENITIES_CATALOG.map((item) => {
              const selected = selectedAmenities.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleAmenity(item.key)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium text-left transition ${
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 5: Description & Photos */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> 5. Photos & Description
          </h2>

          <div>
            <label htmlFor="field-photo-url-image-link" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Photo URL (Image link)</label>
            <input id="field-photo-url-image-link"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Leave blank to use a high-resolution demo property cover image.
            </p>
          </div>

          <div>
            <label htmlFor="field-detailed-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Detailed Description</label>
            <textarea id="field-detailed-description"
              required
              rows={4}
              minLength={20}
              placeholder="Describe the rooms, house rules, nearby metro stations, and included food/amenities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} size="lg" className="w-full font-semibold gap-2">
          {loading ? 'Submitting property...' : 'Publish Listing'} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </main>
  );
}
