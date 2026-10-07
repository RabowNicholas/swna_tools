'use client';

import { useEffect } from 'react';
import { PageError } from '@/components/ui/PageStatus';
import { trackError } from '@/lib/events/client';

/** Shown when a page crashes while rendering. The crash is reported to /admin/usage. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackError(error, 'error-boundary');
  }, [error]);

  return (
    <PageError
      title="Something went wrong on this page"
      message="It’s been reported. Try again, and if it keeps happening, let Nick know."
      onRetry={reset}
    />
  );
}
