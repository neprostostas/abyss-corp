export type Consent = 'accepted' | 'declined' | null;
interface ConsentState {
  readonly consent: Consent;
  readonly preferencesOpen: boolean;
}
const preferenceKey = 'abyss-corp.cookie-consent.v1';
const cookieName = 'abyss_visitor';
const sessionCookie = 'abyss_visit';
const cookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${String(maxAge)}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
/** Sends only explicit anonymous page events after consent; never auth URLs or email. */
export class VisitorAnalytics {
  private state: ConsentState = { consent: null, preferencesOpen: false };
  private readonly listeners = new Set<() => void>();
  private lastPage: string | null = null;
  constructor() {
    try {
      const value = JSON.parse(
        localStorage.getItem(preferenceKey) ?? 'null',
      ) as unknown;
      if (
        typeof value === 'object' &&
        value !== null &&
        'choice' in value &&
        'expiresAt' in value &&
        typeof value.expiresAt === 'number' &&
        value.expiresAt > Date.now() &&
        (value.choice === 'accepted' || value.choice === 'declined')
      )
        this.state = { ...this.state, consent: value.choice };
    } catch {
      /* Missing or inaccessible preference means no consent. */
    }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<ConsentState>) {
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) listener();
  }
  openPreferences = () => {
    this.publish({ preferencesOpen: true });
  };
  closePreferences = () => {
    this.publish({ preferencesOpen: false });
  };
  choose = (choice: Exclude<Consent, null>) => {
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({ choice, expiresAt: Date.now() + 180 * 86400000 }),
      );
    } catch {
      /* Respect the choice for this tab even when persistence is blocked. */
    }
    this.publish({ consent: choice, preferencesOpen: false });
    if (choice === 'declined') {
      setCookie(cookieName, '', 0);
      setCookie(sessionCookie, '', 0);
      this.lastPage = null;
    } else this.page();
  };
  page = () => {
    if (
      this.state.consent !== 'accepted' ||
      !['abysscorp.us.ci', 'abyss-corp.netlify.app'].includes(location.hostname)
    )
      return;
    const key: unknown = import.meta.env.VITE_POSTHOG_KEY;
    if (typeof key !== 'string' || !key.startsWith('phc_')) return;
    const path =
      location.pathname === '/'
        ? '/'
        : location.pathname === '/reset-password'
          ? '/reset-password'
          : location.pathname === '/database'
            ? '/database'
            : location.pathname === '/analytics'
              ? '/analytics'
              : '/other';
    // Administration traffic and recovery pages are not product analytics.
    if (path !== '/' || this.lastPage === path) return;
    this.lastPage = path;
    const visitor = cookie(cookieName) ?? crypto.randomUUID();
    const session = cookie(sessionCookie) ?? crypto.randomUUID();
    setCookie(cookieName, visitor, 180 * 86400);
    setCookie(sessionCookie, session, 1800);
    const payload = JSON.stringify({
      api_key: key,
      event: '$pageview',
      distinct_id: visitor,
      properties: {
        $session_id: session,
        $current_url: location.origin + path,
        $pathname: path,
        $host: location.hostname,
        $process_person_profile: false,
        $device_type: matchMedia('(max-width:760px)').matches
          ? 'Mobile'
          : 'Desktop',
        app: 'abyss-corp',
        environment: ['abysscorp.us.ci', 'abyss-corp.netlify.app'].includes(
          location.hostname,
        )
          ? 'production'
          : 'preview',
        consent_version: 1,
      },
    });
    void fetch('https://eu.i.posthog.com/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(8000),
    }).catch(() => {
      this.lastPage = null;
    });
  };
}
export const visitorAnalytics = new VisitorAnalytics();
