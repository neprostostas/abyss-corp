import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { ADMIN_TABLE_IDS, ADMIN_PAGE_SIZE } from '../../application/adminPorts';
import type {
  AdminPage,
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
export class AdminDatabaseClient implements AdminDatabaseGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}
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
