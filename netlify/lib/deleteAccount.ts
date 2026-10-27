/** Narrow service port keeps the destructive sequence testable without accounts. */
export interface AccountDeletionServices {
  verifiedUser: () => Promise<{ id: string; anonymous: boolean } | null>;
  activeSession: () => Promise<boolean>;
  revokeSessions: () => Promise<void>;
  listPhotos: (userId: string) => Promise<string[]>;
  removePhotos: (paths: string[]) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}
export async function deleteOwnAccount(
  services: AccountDeletionServices,
): Promise<boolean> {
  const user = await services.verifiedUser();
  if (!user || user.anonymous || !(await services.activeSession()))
    return false;
  // Revoke first so another tab cannot upload while its files are being removed.
  await services.revokeSessions();
  for (;;) {
    const files = await services.listPhotos(user.id);
    if (!files.length) break;
    await services.removePhotos(files.map((file) => `${user.id}/${file}`));
  }
  await services.deleteUser(user.id);
  return true;
}
