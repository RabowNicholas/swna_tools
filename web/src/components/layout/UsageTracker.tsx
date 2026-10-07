'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { track, trackError } from '@/lib/events/client';

/**
 * Records a page view on every route change and reports browser crashes.
 * Mounted once in the root layout. Tool runs are recorded on the server, so
 * pages don't need to report anything themselves.
 */
export function UsageTracker() {
  const pathname = usePathname();
  const { status } = useSession();
  const signedIn = status === 'authenticated';

  useEffect(() => {
    if (signedIn && pathname) track({ type: 'page_view', path: pathname });
  }, [signedIn, pathname]);

  useEffect(() => {
    if (!signedIn) return;
    const onError = (e: ErrorEvent) => trackError(e.error ?? e.message, 'window.onerror');
    const onRejection = (e: PromiseRejectionEvent) => trackError(e.reason, 'unhandledrejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [signedIn]);

  return null;
}
