import { visitorAnalytics } from '../../infrastructure/analytics/VisitorAnalytics';
export function PrivacyScreen() {
  return (
    <main className="privacy-screen">
      <a href="/">← Back to game</a>
      <h1>Privacy & cookies</h1>
      <p>
        Abyss Corp uses Supabase for accounts and saved progress. Email, account
        ID, nickname and game saves are stored there. Passwords are handled by
        Supabase Auth; they are never included in analytics.
      </p>
      <h2>Essential storage</h2>
      <p>
        Browser storage keeps guest progress, a guest transfer backup, your
        sign-in session, account-specific progress and cookie choice. It is
        required for those features. Transactional confirmation and recovery
        emails are delivered through Brevo.
      </p>
      <h2>Profile</h2>
      <p>
        Your nickname is visible on the leaderboard. When you use a connected
        social sign-in provider, we display the name and photo it supplies in
        your private profile. Loading that photo contacts the provider’s image
        server. Email sign-in does not give us access to your email account’s
        photo.
      </p>
      <h2>Optional analytics</h2>
      <p>
        Only after you allow it, PostHog EU receives anonymous page visits, a
        random visitor ID, a short-lived session ID, device category, site
        hostname and the consent version. We remove query strings, URL fragments
        and referrer URLs. We do not send email, account IDs, form fields, game
        saves, session recordings or advertising identifiers. PostHog also
        receives network information such as IP addresses when processing
        requests.
      </p>
      <p>
        The visitor cookie expires after 180 days; the visit cookie after 30
        minutes. Your consent choice expires after 180 days. Reports include
        consenting visitors only, so visitor counts may be lower than total
        traffic. Analytics event retention follows the configured PostHog plan,
        currently up to one year on Free.
      </p>
      <h2>Your choice</h2>
      <p>
        You can refuse analytics and still play. Withdrawing consent stops new
        events and removes analytics cookies; it does not erase events already
        processed. For account/data requests, contact{' '}
        <a href="mailto:neprostostas.gg@gmail.com">neprostostas.gg@gmail.com</a>
        .
      </p>
      <button onClick={visitorAnalytics.openPreferences}>
        Cookie preferences
      </button>
    </main>
  );
}
