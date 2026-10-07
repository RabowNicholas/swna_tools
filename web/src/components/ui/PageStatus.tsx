'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';

/** The one loading screen every page shows while its data arrives. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="md" label={label} />
    </div>
  );
}

/** The one error screen every page shows when its data can't be loaded. */
export function PageError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div role="alert" className="max-w-md space-y-3 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
