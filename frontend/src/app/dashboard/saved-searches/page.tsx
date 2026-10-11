'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Bell,
  Trash2,
  Plus,
  BellOff,
  BellRing,
  Filter,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';


interface SavedSearch {
  _id: string;
  name: string;
  filters: {
    city?: string;
    locality?: string;
    propertyType?: string | string[];
    minRent?: number;
    maxRent?: number;
    furnishing?: string;
    tenantPreference?: string;
  };
  alertEnabled: boolean;
  alertFrequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
  lastMatchCount: number;
  createdAt: string;
  lastCheckedAt: string | null;
}

function buildSearchUrl(filters: SavedSearch['filters']): string {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.locality) params.set('locality', filters.locality);
  if (filters.propertyType) {
    const types = Array.isArray(filters.propertyType) ? filters.propertyType : [filters.propertyType];
    types.forEach((t) => params.append('type', t));
  }
  if (filters.minRent) params.set('minRent', String(filters.minRent));
  if (filters.maxRent) params.set('maxRent', String(filters.maxRent));
  if (filters.furnishing) params.set('furnishing', filters.furnishing);
  if (filters.tenantPreference) params.set('tenant', filters.tenantPreference);
  return `/search?${params.toString()}`;
}

function buildFilterLabel(filters: SavedSearch['filters']): string {
  const parts: string[] = [];
  if (filters.city) parts.push(filters.city);
  if (filters.locality) parts.push(filters.locality);
  if (filters.propertyType) {
    const types = Array.isArray(filters.propertyType) ? filters.propertyType : [filters.propertyType];
    parts.push(types.join(', '));
  }
  if (filters.minRent || filters.maxRent) {
    const min = filters.minRent ? `₹${filters.minRent.toLocaleString('en-IN')}` : '';
    const max = filters.maxRent ? `₹${filters.maxRent.toLocaleString('en-IN')}` : '';
    if (min && max) parts.push(`${min}–${max}`);
    else if (min) parts.push(`From ${min}`);
    else if (max) parts.push(`Up to ${max}`);
  }
  if (filters.furnishing) parts.push(filters.furnishing.replace(/_/g, ' '));
  if (filters.tenantPreference) parts.push(filters.tenantPreference.replace(/_/g, ' '));
  return parts.join(' · ') || 'All rentals';
}

const FREQ_LABEL: Record<string, string> = {
  IMMEDIATE: 'Instant alerts',
  DAILY: 'Daily digest',
  WEEKLY: 'Weekly summary',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/saved-searches');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) setSearches(data.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleAlert = async (id: string, current: boolean) => {
    try {
      const res = await apiFetch(`/saved-searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEnabled: !current }),
      });
      if (res.ok) {
        setSearches((prev) =>
          prev.map((s) => (s._id === id ? { ...s, alertEnabled: !current } : s))
        );
      }
    } catch {
      // Ignore
    }
  };

  const deleteSearch = async (id: string) => {
    if (!window.confirm('Delete this saved search?')) return;
    try {
      await apiFetch(`/saved-searches/${id}`, { method: 'DELETE' });
      setSearches((prev) => prev.filter((s) => s._id !== id));
    } catch {
      // Ignore
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary text-white shadow-lg">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Saved Searches</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Get alerted when new listings match your criteria
              </p>
            </div>
          </div>
          <Link
            href="/search"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Search
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 flex items-start gap-3 mb-6">
        <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How it works:</span> Run a search on our search page,
          then click &quot;Save this search&quot; to bookmark it. You&apos;ll get notified whenever new listings match.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading saved searches...</p>
        </div>
      ) : searches.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center">
          <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-base font-semibold text-foreground">No saved searches yet</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            Search for rentals and save the query to receive alerts when new listings appear.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Search className="h-4 w-4" /> Explore Rentals
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div
              key={s._id}
              className="group rounded-2xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition"
            >
              {/* Icon */}
              <div
                className={`shrink-0 p-3 rounded-xl ${
                  s.alertEnabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.alertEnabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Filter className="h-3 w-3 shrink-0" />
                  <span className="truncate">{buildFilterLabel(s.filters)}</span>
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {s.alertEnabled && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      <Bell className="h-3 w-3" /> {FREQ_LABEL[s.alertFrequency]}
                    </span>
                  )}
                  {s.lastMatchCount > 0 && (
                    <span className="text-xs text-primary font-semibold">
                      {s.lastMatchCount} match{s.lastMatchCount !== 1 ? 'es' : ''} found
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Saved {timeAgo(s.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={buildSearchUrl(s.filters)}
                  className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                >
                  Run Search
                </Link>
                <button
                  type="button"
                  onClick={() => toggleAlert(s._id, s.alertEnabled)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                    s.alertEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                  title={s.alertEnabled ? 'Disable alerts' : 'Enable alerts'}
                >
                  {s.alertEnabled ? 'Alerts On' : 'Alerts Off'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSearch(s._id)}
                  className="rounded-lg h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition"
                  title="Delete saved search"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
