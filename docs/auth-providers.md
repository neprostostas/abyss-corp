# Sign-in provider setup

All native OAuth applications use `https://qduhqhhhsboljuipruvy.supabase.co/auth/v1/callback`. The website callback stays `https://abysscorp.us.ci/`. Secrets belong only in Supabase provider settings, never VITE variables, Git, or public/auth-providers.json.

| Display name | Supabase ID       | Setup                                                                                                                                                            |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google       | `google`          | Configured and verified on production                                                                                                                            |
| Discord      | `discord`         | App `1564692722789515396`; enabled in Supabase; full player sign-in verification pending                                                                         |
| GitHub       | `github`          | OAuth app `3969507`; enabled in Supabase; full player sign-in verification pending                                                                               |
| Twitch       | `twitch`          | App `y6yltmiwz2g6zpvzmh65pbxb02sqn0`; enabled in Supabase; full player sign-in verification pending                                                              |
| Microsoft    | `azure`           | Entra app `5f5f27ee-c665-4dac-8130-1a5ef7b378d1`; all Microsoft account types; enabled in Supabase; authorization redirect verified; full player sign-in pending |
| X / Twitter  | `x`               | OAuth 2.0 app; request confirmed email; developer onboarding pending                                                                                             |
| LinkedIn     | `linkedin_oidc`   | Excluded at the owner’s request                                                                                                                                  |
| Telegram     | `custom:telegram` | OIDC enabled; bot `abysscorp_login_bot`; email optional; profile migration applied; production sign-in reached nickname onboarding                               |
| Steam        | `custom:steam`    | OpenID-to-OAuth bridge implemented; Netlify secret configured; Supabase enabled; redirect to Steam verified; full player sign-in pending                         |

Apple is excluded from the frontend catalog. Facebook remains disabled because the owner's account lacks the business verification required by Meta's current setup flow.

GoTrue's public `/settings` currently omits custom provider registrations and some newer built-ins. Only after a custom/X backend is configured and tested, add its exact ID to the `providers` array in `public/auth-providers.json`. Unknown provider IDs are rejected by the client allowlist. This manifest is public configuration, not an authorization mechanism. All session and token verification remains on the server.

Profile names supplied by identity providers stay private. Public captain names are always chosen by the player. Telegram profiles and progress use server-owned `auth.identities` rows with provider `custom:telegram`. Editable user metadata cannot provision players. Anonymous and banned accounts are excluded. Administrator access still requires a confirmed email. No placeholder email is invented. Other email-less providers must receive an explicit backend review before activation.

Provider icon paths for Discord, GitHub, Telegram, Steam, Twitch and X come from [Simple Icons](https://github.com/simple-icons/simple-icons), under CC0. SVGs are rendered locally without third-party icon requests.

Manual identity linking is enabled in Supabase. The profile lists connected identities and offers enabled providers under “Connect another account”. Linking uses `auth.linkIdentity`, flushes the current save before redirecting and keeps the same player account. An identity already owned by another player is rejected rather than merging saves. Email association requires email confirmation.

The header avatar carries a session provider badge. Its local session label is cosmetic only and never authorizes access; linked identities are read from Supabase Auth.

Steam uses `netlify/functions/steam-auth.ts` as a confidential OAuth2 bridge. It accepts only the fixed Supabase callback, binds Steam assertions to an HttpOnly browser cookie, verifies signed OpenID responses directly with Steam and rejects stale/replayed nonces. Netlify Blobs uses strong consistency and conditional writes for one-time codes. Codes expire after 60 seconds and userinfo tokens after 120 seconds. PKCE S256 is supported. The scheduled cleanup removes expired records. The client secret lives in Netlify environment configuration and Supabase; it is never a VITE variable. Public Steam profile metadata is optional and never establishes identity.
