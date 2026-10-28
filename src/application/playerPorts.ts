export const LEADERBOARD_PAGE_SIZE = 20;
export interface PlayerStanding {
  readonly id: string;
  readonly captainName: string;
  readonly position: number;
  readonly prestige: number;
  readonly depthMeters: number;
  readonly upgrades: number;
  readonly research: number;
  readonly automation: number;
  readonly credits: number;
}
export interface LeaderboardPage {
  readonly players: readonly PlayerStanding[];
  readonly currentPlayer: PlayerStanding | null;
  readonly total: number;
}
export interface PlayerGateway {
  loadLeaderboard(page: number): Promise<LeaderboardPage>;
  renameCaptain(name: string): Promise<void>;
}
