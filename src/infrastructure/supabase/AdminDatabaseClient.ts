import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { ADMIN_TABLE_IDS, ADMIN_PAGE_SIZE } from '../../application/adminPorts';
import type {
  AdminPage,
  AdminOverview,
  AdminTableId,
  AdminDatabaseGateway,
} from '../../application/adminPorts';
const schema = z
  .object({
    rows: z.array(z.record(z.string(), z.json())),
    total: z.number().int().nonnegative(),
    tables: z.record(z.enum(ADMIN_TABLE_IDS), z.number().int().nonnegative()),
    page_size: z.literal(ADMIN_PAGE_SIZE),
  })
  .strict();
const overviewSchema = z.object({
  updatedAt: z.string(),
  totals: z.object({
    accounts: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
    withProgress: z.number().int().nonnegative(),
    saved7Days: z.number().int().nonnegative(),
  }),
  depths: z.array(
    z.object({
      depth: z.number().int().nonnegative(),
      count: z.number().int().nonnegative(),
    }),
  ),
  registrations: z.array(
    z.object({ day: z.string(), value: z.number().int().nonnegative() }),
  ),
});
export class AdminDatabaseClient implements AdminDatabaseGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async overview(): Promise<AdminOverview> {
    const { data, error } = await this.client.rpc('admin_overview');
    if (error?.code === '42501')
      throw new Error('Administrator access required.');
    if (error) throw new Error('Overview unavailable. Try again.');
    return overviewSchema.parse(data);
  }
  async load(
    table: AdminTableId,
    page: number,
    search: string,
  ): Promise<AdminPage> {
    const { data, error } = await this.client.rpc('admin_database', {
      table_name: table,
      page_index: page,
      filter_text: search,
    });
    if (error?.code === '42501')
      throw new Error('Administrator access required.');
    if (error) throw new Error('Database unavailable. Try again.');
    return schema.parse(data);
  }
}
