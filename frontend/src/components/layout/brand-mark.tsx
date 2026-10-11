import { cn } from '@/lib/cn';

/**
 * StayNearby logomark: a location pin whose core is a house — "a home near you".
 * Inlined as SVG so it costs no request and scales crisply at any size.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="StayNearby"
      className={cn('h-5 w-5', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3c-5.523 0-10 4.476-10 10 0 6.5 10 16 10 16s10-9.5 10-16c0-5.524-4.477-10-10-10Z"
        fill="currentColor"
      />
      <path
        d="M11.5 14.5 16 10.5l4.5 4v5.25a1 1 0 0 1-1 1h-2.25V17a1 1 0 0 0-1-1h-.5a1 1 0 0 0-1 1v3.75H12.5a1 1 0 0 1-1-1V14.5Z"
        fill="hsl(var(--card))"
      />
    </svg>
  );
}

/**
 * The full lockup used in the header and footer. `StayNearby` is always written
 * with that exact capitalisation.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BrandMark className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Stay<span className="text-primary">Nearby</span>
      </span>
    </span>
  );
}
