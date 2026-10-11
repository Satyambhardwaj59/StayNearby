'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { ArrowUpDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'rent_asc', label: 'Rent: low to high' },
  { value: 'rent_desc', label: 'Rent: high to low' },
] as const;

/**
 * Sort control for the search results. Updates the `sort` query param in place so
 * active filters are preserved, and resets pagination so users do not land on an
 * empty page after re-sorting.
 */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== 'newest') {
      params.set('sort', next);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/search?${queryString}` : '/search');
    });
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <label htmlFor="sort" className="sr-only">
        Sort results
      </label>
      <select
        id="sort"
        value={value}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
