# Sign-in provider setup

All native OAuth applications use `https://qduhqhhhsboljuipruvy.supabase.co/auth/v1/callback`. The website callback stays `https://abysscorp.us.ci/`. Secrets belong only in Supabase provider settings, never VITE variables, Git, or public/auth-providers.json.

| Display name | Supabase ID       | Setup                                                                                                                             |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Google       | `google`          | Configured and verified on production                                                                                             |
| Discord      | `discord`         | App `1564692722789515396`; redirect configured; secret transfer pending                                                           |
| GitHub       | `github`          | OAuth app `3969507`; redirect configured; secret transfer pending                                                                 |
| Twitch       | `twitch`          | App `y6yltmiwz2g6zpvzmh65pbxb02sqn0`; redirect configured; secret transfer pending                                                |
| Microsoft    | `azure`           | Entra app registration; request `email`; use an account allowed to register apps                                                  |
| X / Twitter  | `x`               | OAuth 2.0 app; request confirmed email; developer onboarding pending                                                              |
| LinkedIn     | `linkedin_oidc`   | LinkedIn Page association, app logo, OpenID Connect product and redirect required                                                 |
| Telegram     | `custom:telegram` | OIDC issuer `https://oauth.telegram.org`, BotFather client ID/secret, `openid profile`, email optional; backend onboarding needed |
| Steam        | `custom:steam`    | Steam uses OpenID 2.0; an authenticated server-side bridge is needed before it can be a Supabase OAuth provider                   |

Apple is excluded from the frontend catalog. Facebook remains disabled because the owner's account lacks the business verification required by Meta's current setup flow.

GoTrue's public `/settings` currently omits custom provider registrations and some newer built-ins. Only after a custom/X backend is configured and tested, add its exact ID to the `providers` array in `public/auth-providers.json`. Unknown provider IDs are rejected by the client allowlist. This manifest is public configuration, not an authorization mechanism. All session and token verification remains on the server.

Profile names supplied by identity providers stay private. Public captain names are always chosen by the player. Providers without an email cannot be activated until profile provisioning and progress projection accept their verified server-side identities; do not invent an email address to bypass this.

Provider icon paths for Discord, GitHub, Telegram, Steam, Twitch and X come from [Simple Icons](https://github.com/simple-icons/simple-icons), under CC0. SVGs are rendered locally without third-party icon requests.
