'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Eye, Heart, ArrowLeft, ExternalLink, Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { formatRent } from '@/lib/format';

interface OwnerProperty {
  _id: string;
  title: string;
  slug: string;
  rent: number;
  listingStatus: string;
  viewsCount: number;
  favoritesCount: number;
  address: { locality: string; city: string };
}

export default function MyPropertiesPage() {
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperties() {
      try {
        const res = await apiFetch('/properties/mine');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data?.properties)) {
            setProperties(data.data.properties);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadProperties();
  }, []);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              My Listed Properties
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track metrics, manage availability and view performance
          </p>
        </div>

        <Link
          href="/dashboard/properties/new"
          className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5 self-start sm:self-auto' })}
        >
          <Plus className="h-4 w-4" /> Add New Listing
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading your listings...</p>
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-4">
          {properties.map((p) => {
            const statusStyles =
              p.listingStatus === 'PUBLISHED'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : p.listingStatus === 'DRAFT'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : p.listingStatus === 'UNDER_REVIEW'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                : p.listingStatus === 'REJECTED'
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : 'bg-muted text-muted-foreground border-border';

            return (
              <div
                key={p._id}
                className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-primary/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyles}`}>
                      {p.listingStatus}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.address?.locality}, {p.address?.city}
                    </span>
                  </div>

                  <p className="text-base font-bold text-foreground">{p.title}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatRent(p.rent)} / mo</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {p.viewsCount || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-rose-500" /> {p.favoritesCount || 0} saves
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/dashboard/properties/${p._id}/edit`}
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <Link
                    href={`/properties/${p.slug}`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5' })}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Public
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-12 text-center max-w-md mx-auto my-8">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h2 className="text-base font-semibold text-foreground">No properties posted yet</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            List your PG, flat, or room today and connect with thousands of verified tenants with zero brokerage.
          </p>
          <Link
            href="/dashboard/properties/new"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Post First Property
          </Link>
        </div>
      )}
    </main>
  );
}
