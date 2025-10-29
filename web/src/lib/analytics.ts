import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

class AnalyticsService {
  private initialized = false;

  init() {
    if (this.initialized || !MIXPANEL_TOKEN) {
      return;
    }

    try {
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: process.env.NODE_ENV === 'development',
        track_pageview: true,
        persistence: 'localStorage',
      });
      this.initialized = true;
      console.log('[Analytics] Mixpanel initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize Mixpanel:', error);
    }
  }

  identify(userId: string, userProperties?: Record<string, any>) {
    if (!this.initialized) return;

    try {
      mixpanel.identify(userId);
      if (userProperties) {
        mixpanel.people.set(userProperties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to identify user:', error);
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized) return;

    try {
      mixpanel.track(eventName, properties);
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  reset() {
    if (!this.initialized) return;

    try {
      mixpanel.reset();
    } catch (error) {
      console.error('[Analytics] Failed to reset:', error);
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Convenience functions for common events
export const trackEvent = {
  // User events
  userLoggedIn: (userId: string, email: string, name: string, role: string) => {
    analytics.identify(userId, { email, name, role });
    analytics.track('user_logged_in', { email, name, role });
  },

  userLoggedOut: (userId: string) => {
    analytics.track('user_logged_out', { user_id: userId });
    analytics.reset();
  },

  // Form events
  formViewed: (formType: string, userId: string) => {
    analytics.track('form_viewed', { form_type: formType, user_id: userId });
  },

  pdfGenerated: (formType: string, userId: string, clientId?: string) => {
    analytics.track('pdf_generated', {
      form_type: formType,
      user_id: userId,
      client_id: clientId,
    });
  },

  // Client events
  clientSelected: (userId: string, clientId: string, sourcePage: string) => {
    analytics.track('client_selected', {
      user_id: userId,
      client_id: clientId,
      source_page: sourcePage,
    });
  },

  // Page views (tracked automatically by Mixpanel, but can be called manually)
  pageViewed: (path: string, userId?: string) => {
    analytics.track('page_viewed', {
      path,
      user_id: userId,
    });
  },
};
