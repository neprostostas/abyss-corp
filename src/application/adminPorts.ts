export const ADMIN_TABLE_IDS = [
  'profiles',
  'auth_users',
  'game_saves',
  'player_progress',
  'admin_users',
  'admin_invitations',
] as const;
export type AdminTableId = (typeof ADMIN_TABLE_IDS)[number];
export const ADMIN_TABLES = {
  profiles: { label: 'Profiles', columns: ['email', 'id', 'created_at'] },
  auth_users: {
    label: 'Accounts',
    columns: [
      'email',
      'email_confirmed_at',
      'last_sign_in_at',
      'banned_until',
      'id',
      'providers',
      'created_at',
    ],
  },
  game_saves: {
    label: 'Saves',
    columns: ['user_id', 'revision', 'updated_at', 'write_id', 'save'],
  },
  player_progress: {
    label: 'Progress',
    columns: [
      'captain_name',
      'depth_m',
      'outposts',
      'upgrades',
      'research',
      'automation',
      'credits',
      'updated_at',
      'id',
    ],
  },
  admin_users: { label: 'Admins', columns: ['email', 'user_id'] },
  admin_invitations: { label: 'Invitations', columns: ['email'] },
} as const satisfies Record<
  AdminTableId,
  { readonly label: string; readonly columns: readonly string[] }
>;
export const ADMIN_PAGE_SIZE = 25;
export interface AdminPage {
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly total: number;
  readonly tables: Readonly<Record<AdminTableId, number>>;
  readonly page_size: typeof ADMIN_PAGE_SIZE;
}
export interface AdminDatabaseGateway {
  load(table: AdminTableId, page: number, search: string): Promise<AdminPage>;
}
