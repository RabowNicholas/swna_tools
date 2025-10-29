'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { analytics, trackEvent } from '@/lib/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Initialize Mixpanel on mount
  useEffect(() => {
    analytics.init();
  }, []);

  // Identify user when session is available
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user;
      trackEvent.userLoggedIn(
        user.id,
        user.email || '',
        user.name || '',
        user.role || 'user'
      );
    }
  }, [session, status]);

  return <>{children}</>;
}
