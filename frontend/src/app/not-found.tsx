import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { notFoundMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = notFoundMetadata('Page not found');

export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-h2 font-bold text-foreground">We could not find that page</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or is no longer available. Try searching for a
        home instead.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link href="/search" className={buttonVariants({ className: 'gap-2' })}>
          <Search className="h-4 w-4" aria-hidden /> Search rentals
        </Link>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
