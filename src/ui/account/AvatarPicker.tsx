import { useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';
import { AVATARS } from '../../data/avatars';
import { GameIcon } from '../components/GameIcon';
import { prepareAvatar } from '../../infrastructure/images/prepareAvatar';

export function AvatarPicker({
  user,
  client,
}: {
  user: User;
  client: SupabaseClient<Database>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not update photo. Try again.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const choose = async (id: string, url: string | null = null) => {
    const { error: failure } = await client.auth.updateUser({
      data: { abyss_avatar: id, abyss_avatar_url: url },
    });
    if (failure) throw failure;
  };
  return (
    <section className="avatar-picker">
      <button
        className="settings-control"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        disabled={busy}
      >
        <GameIcon name="camera" />
        <span>Change photo</span>
        <GameIcon name="arrow" />
      </button>
      {open && (
        <div className="avatar-options" aria-busy={busy}>
          <div className="avatar-grid" aria-label="Choose an avatar">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                title={avatar.name}
                aria-label={avatar.name}
                aria-pressed={user.user_metadata.abyss_avatar === avatar.id}
                disabled={busy}
                onClick={() => {
                  void run(() => choose(avatar.id));
                }}
              >
                <img src={avatar.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="avatar-tools">
            <button
              disabled={busy}
              onClick={() => {
                file.current?.click();
              }}
            >
              Upload photo
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                void run(() => choose('social'));
              }}
            >
              Use social photo
            </button>
          </div>
          <small>JPG, PNG or WebP · up to 5 MB</small>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload profile photo"
            className="avatar-file"
            disabled={busy}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = '';
              if (!selected) return;
              void run(async () => {
                const image = await prepareAvatar(selected);
                const path = `${user.id}/${crypto.randomUUID()}.webp`;
                const bucket = client.storage.from('avatars');
                const { error: failure } = await bucket.upload(path, image, {
                  contentType: 'image/webp',
                  upsert: false,
                });
                if (failure)
                  throw new Error('Photo upload failed. Please try again.');
                const url = bucket.getPublicUrl(path).data.publicUrl;
                try {
                  await choose('upload', url);
                } catch (failure) {
                  await bucket.remove([path]);
                  throw failure;
                }
                const previous: unknown = user.user_metadata.abyss_avatar_url;
                if (typeof previous === 'string') {
                  const marker = `/storage/v1/object/public/avatars/${user.id}/`;
                  try {
                    const old = new URL(previous);
                    if (old.pathname.includes(marker))
                      await bucket.remove([
                        `${user.id}/${old.pathname.split(marker)[1] ?? ''}`,
                      ]);
                  } catch {
                    /* An invalid previous photo does not affect the new one. */
                  }
                }
              });
            }}
          />
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
