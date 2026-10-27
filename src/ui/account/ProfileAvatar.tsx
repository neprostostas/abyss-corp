import { useState } from 'react';
import { captainInitial } from '../../domain/captainName';
export function ProfileAvatar({
  name,
  url,
}: {
  name: string;
  url: string | null;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="account-avatar" aria-hidden="true">
      {url && failed !== url ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(url);
          }}
        />
      ) : (
        captainInitial(name)
      )}
    </span>
  );
}
