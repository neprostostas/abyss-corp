import { useEffect, useSyncExternalStore } from 'react';
import { visitorAnalytics } from '../../infrastructure/analytics/VisitorAnalytics';
export function CookieConsent() {
  const state = useSyncExternalStore(
    visitorAnalytics.subscribe,
    visitorAnalytics.getSnapshot,
  );
  useEffect(() => {
    visitorAnalytics.page();
  }, []);
  if (state.consent !== null && !state.preferencesOpen) return null;
  return (
    <section className="cookie-consent" aria-label="Cookie preferences">
      <div>
        <strong>Cookies & privacy</strong>
        <p>
          Essential storage keeps you signed in and saves your game. Optional
          PostHog analytics counts visits with an anonymous ID. No recordings or
          ad tracking.
        </p>
        <a href="/privacy">Privacy details</a>
      </div>
      <div className="cookie-actions">
        <button
          onClick={() => {
            visitorAnalytics.choose('declined');
          }}
        >
          Essential only
        </button>
        <button
          onClick={() => {
            visitorAnalytics.choose('accepted');
          }}
        >
          Allow analytics
        </button>
        {state.consent !== null && (
          <button
            className="text-button"
            onClick={visitorAnalytics.closePreferences}
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
