'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
      />
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </main>
  );
}
