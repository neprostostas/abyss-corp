import { customAvatar } from '../data/avatars';
import { normalizeCaptainName } from './captainName';

export function needsCaptainName(
  name: string | null,
  userId: string,
  confirmed = false,
): boolean {
  return (
    !name ||
    (!confirmed &&
      name ===
        `Captain ${userId.replaceAll('-', '').slice(0, 8).toUpperCase()}`)
  );
}
export function requestedCaptainName(
  metadata: Record<string, unknown>,
): string | null {
  if (typeof metadata.captain_name !== 'string') return null;
  try {
    return normalizeCaptainName(metadata.captain_name);
  } catch {
    return null;
  }
}
export function profileDetails(metadata: Record<string, unknown>) {
  const candidate = metadata.avatar_url ?? metadata.picture;
  let avatar: string | null = null;
  if (typeof candidate === 'string') {
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:' && !url.username && !url.password)
        avatar = url.href;
    } catch {
      /* A missing or invalid provider photo uses initials. */
    }
  }
  const name = metadata.full_name ?? metadata.name;
  return {
    avatar,
    fullName: typeof name === 'string' ? name.slice(0, 150) : null,
  };
}

export function accountProfileDetails(
  user: {
    user_metadata: Record<string, unknown>;
    identities?: {
      provider: string;
      identity_data?: Record<string, unknown>;
    }[];
  },
  current: string | null,
) {
  const identities = user.identities ?? [];
  const active = profileDetails(
    identities.find((identity) => identity.provider === current)
      ?.identity_data ?? {},
  );
  const primary = profileDetails(user.user_metadata);
  const others = identities.map((identity) =>
    profileDetails(identity.identity_data ?? {}),
  );
  return {
    avatar:
      customAvatar(user.user_metadata) ??
      active.avatar ??
      primary.avatar ??
      others.find((details) => details.avatar)?.avatar ??
      null,
    fullName:
      active.fullName ??
      primary.fullName ??
      others.find((details) => details.fullName)?.fullName ??
      null,
  };
}
