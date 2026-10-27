import { normalizeCaptainName } from '../../domain/captainName';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type {
  PlayerGateway,
  PlayerStanding,
  LeaderboardPage,
} from '../../application/playerPorts';
import { LEADERBOARD_PAGE_SIZE } from '../../application/playerPorts';
type StandingRow = Database['public']['Views']['leaderboard']['Row'];
function standing(row: StandingRow): PlayerStanding {
  if (!row.id || !row.captain_name || row.position === null)
    throw new Error('Player progress is unavailable.');
  return {
    id: row.id,
    captainName: row.captain_name,
    position: row.position,
    depthMeters: row.depth_m ?? 0,
    upgrades: row.upgrades ?? 0,
    research: row.research ?? 0,
    automation: row.automation ?? 0,
    credits: row.credits ?? 0,
  };
}
export class PlayerClient implements PlayerGateway {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}
  async loadLeaderboard(page: number): Promise<LeaderboardPage> {
    const [list, own] = await Promise.all([
      this.client
        .from('leaderboard')
        .select('*')
        .order('position')
        .range(
          page * LEADERBOARD_PAGE_SIZE,
          (page + 1) * LEADERBOARD_PAGE_SIZE - 1,
        ),
      this.client
        .from('leaderboard')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle(),
    ]);
    if (list.error || own.error)
      throw new Error('Leaderboard unavailable. Try again.');
    return {
      players: list.data.map(standing),
      currentPlayer: own.data ? standing(own.data) : null,
      total: own.data?.total_players ?? list.data[0]?.total_players ?? 0,
    };
  }
  async renameCaptain(name: string): Promise<void> {
    const captainName = normalizeCaptainName(name);
    const { error } = await this.client
      .from('player_progress')
      .update({ captain_name: captainName })
      .eq('id', this.userId)
      .select('id')
      .single();
    if (error) throw new Error('Could not save your captain name. Try again.');
  }
}
