'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2,
  MapPin,
  IndianRupee,
  ArrowLeft,
  Save,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/api/types';
import { AMENITIES_CATALOG } from '@/lib/format';

const PROPERTY_TYPES = ['PG', 'ROOM', 'FLAT', 'APARTMENT', 'HOUSE', 'HOSTEL', 'CO_LIVING', 'INDEPENDENT_HOUSE'];
const FURNISHING_TYPES = ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'];
const BHK_TYPES = ['RK', '1_BHK', '2_BHK', '3_BHK', '4_BHK', '5_PLUS_BHK'];
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_PLUS'];
const TENANT_PREFERENCES = ['ANYONE', 'STUDENT', 'BACHELOR', 'WORKING_PROFESSIONAL', 'FAMILY', 'COUPLE', 'MALE', 'FEMALE'];

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('PG');
  const [bhk, setBhk] = useState('1_BHK');
  const [roomType, setRoomType] = useState('SINGLE');
  const [furnishing, setFurnishing] = useState('FULLY_FURNISHED');
  const [rent, setRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [maintenanceIncluded, setMaintenanceIncluded] = useState(true);
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [street, setStreet] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [tenantPreferences, setTenantPreferences] = useState<string[]>(['ANYONE']);
  const [availableFrom, setAvailableFrom] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/properties/${propertyId}`);
        if (!res.ok) throw new Error('Failed to fetch property');
        const data = await res.json();
        const p: Property = data.data?.property ?? data.data;
        setProperty(p);

        // Populate form
        setTitle(p.title);
        setDescription(p.description);
        setPropertyType(p.propertyType);
        setBhk(p.bhk ?? '1_BHK');
        setRoomType(p.roomType ?? 'SINGLE');
        setFurnishing(p.furnishing);
        setRent(String(p.rent));
        setSecurityDeposit(String(p.securityDeposit));
        setMaintenance(p.maintenance !== null ? String(p.maintenance) : '');
        setMaintenanceIncluded(p.maintenanceIncluded);
        setArea(p.area !== null ? String(p.area) : '');
        setFloor(p.floor !== null ? String(p.floor) : '');
        setTotalFloors(p.totalFloors !== null ? String(p.totalFloors) : '');
        setCity(p.location.city);
        setLocality(p.location.locality);
        setStreet(p.location.streetAddress ?? '');
        setSelectedAmenities(p.amenities);
        setTenantPreferences(p.tenantPreferences.length > 0 ? p.tenantPreferences : ['ANYONE']);
        setAvailableFrom(p.availableFrom ? p.availableFrom.slice(0, 10) : '');
        setContactPhone(p.contact.phone ?? '');
      } catch {
        setError('Could not load property. It may have been removed or you may not have access.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId]);

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const toggleTenantPref = (pref: string) => {
    setTenantPreferences((prev) =>
      prev.includes(pref)
        ? prev.filter((p) => p !== pref)
        : [...prev.filter((p) => p !== 'ANYONE'), pref]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      propertyType,
      furnishing,
      rent: Number(rent),
      securityDeposit: Number(securityDeposit),
      maintenance: maintenance ? Number(maintenance) : null,
      maintenanceIncluded,
      area: area ? Number(area) : null,
      floor: floor ? Number(floor) : null,
      totalFloors: totalFloors ? Number(totalFloors) : null,
      amenities: selectedAmenities,
      tenantPreferences,
      availableFrom: availableFrom || null,
      contact: { phone: contactPhone || null },
      location: {
        city: city.trim(),
        locality: locality.trim(),
        streetAddress: street.trim() || null,
      },
    };

    if (propertyType === 'PG' || propertyType === 'ROOM' || propertyType === 'HOSTEL') {
      payload.roomType = roomType;
    } else {
      payload.bhk = bhk;
    }

    try {
      const res = await apiFetch(`/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? 'Failed to update listing');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/properties');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this listing? This cannot be undone.')) return;
    try {
      await apiFetch(`/properties/${propertyId}`, { method: 'DELETE' });
      router.push('/dashboard/properties');
    } catch {
      setError('Failed to delete listing. Please try again.');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="py-32 text-center">
          <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading listing data...</p>
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="py-32 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-4" />
          <p className="text-base font-semibold text-foreground mb-2">Property not found</p>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link href="/dashboard/properties" className="text-sm text-primary hover:underline">
            ← Back to My Listings
          </Link>
        </div>
      </main>
    );
  }

  const isPgOrRoom = propertyType === 'PG' || propertyType === 'ROOM' || propertyType === 'HOSTEL';

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Success Banner */}
      {success && (
        <div role="status" className="fixed right-4 top-20 z-50 flex items-center gap-3 rounded-xl border border-success/25 bg-card px-4 py-3 text-sm font-semibold text-success shadow-popover animate-toast-in">
          <CheckCircle2 className="h-4 w-4" /> Listing updated! Redirecting...
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Listings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary text-white shadow-lg shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Edit Listing</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{property.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/properties/${property.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium hover:bg-muted transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 text-destructive bg-destructive/5 px-3 py-2 text-xs font-medium hover:bg-destructive/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/8 p-4 flex items-start gap-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Basic Information
          </h2>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-title">
              Listing Title *
            </label>
            <input
              id="edit-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-type">
                Property Type *
              </label>
              <select
                id="edit-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {isPgOrRoom ? (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-room-type">
                  Room Sharing
                </label>
                <select
                  id="edit-room-type"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, '+').replace('FOUR+', '4+')}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-bhk">
                  BHK Type
                </label>
                <select
                  id="edit-bhk"
                  value={bhk}
                  onChange={(e) => setBhk(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  {BHK_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-furnishing">
                Furnishing
              </label>
              <select
                id="edit-furnishing"
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                {FURNISHING_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-description">
              Description *
            </label>
            <textarea
              id="edit-description"
              required
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/2000</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" /> Pricing &amp; Deposit
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-rent">
                Monthly Rent (₹) *
              </label>
              <input
                id="edit-rent"
                type="number"
                required
                min={0}
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-deposit">
                Security Deposit (₹) *
              </label>
              <input
                id="edit-deposit"
                type="number"
                required
                min={0}
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-maintenance">
                Maintenance (₹)
              </label>
              <input
                id="edit-maintenance"
                type="number"
                min={0}
                value={maintenance}
                onChange={(e) => setMaintenance(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-available-from">
                Available From
              </label>
              <input
                id="edit-available-from"
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-area">
                Area (sq.ft)
              </label>
              <input
                id="edit-area"
                type="number"
                min={0}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. 250"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-contact-phone">
                Contact Phone
              </label>
              <input
                id="edit-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={maintenanceIncluded}
              onChange={(e) => setMaintenanceIncluded(e.target.checked)}
              className="rounded accent-primary h-4 w-4"
            />
            <span className="text-sm text-foreground">Maintenance included in rent</span>
          </label>
        </div>

        {/* Location */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Location
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-city">
                City *
              </label>
              <input
                id="edit-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-locality">
                Locality / Area *
              </label>
              <input
                id="edit-locality"
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="edit-street">
                Street Address (optional)
              </label>
              <input
                id="edit-street"
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Will be shown only after tenant contact"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        {/* Tenant Preferences */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-bold text-foreground mb-3">Preferred Tenants</h2>
          <div className="flex flex-wrap gap-2">
            {TENANT_PREFERENCES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => toggleTenantPref(pref)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition flex items-center gap-1.5 ${
                  tenantPreferences.includes(pref)
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {tenantPreferences.includes(pref) && <Check className="h-3 w-3" />}
                {pref.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-bold text-foreground mb-3">Amenities & Features</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITIES_CATALOG.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleAmenity(item.key)}
                className={`rounded-xl px-3 py-2 text-xs font-medium border text-left flex items-center gap-2 transition ${
                  selectedAmenities.includes(item.key)
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {selectedAmenities.includes(item.key) && <Check className="h-3 w-3 shrink-0" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <Link
            href="/dashboard/properties"
            className="rounded-xl border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={saving} className="gap-2 px-8 py-2.5 font-semibold">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
