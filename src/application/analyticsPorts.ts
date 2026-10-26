export interface TrafficCounts {
  readonly visitors: number;
  readonly pageviews: number;
  readonly sessions: number;
}
export interface TrafficReport {
  readonly days: number;
  readonly updatedAt: string;
  readonly totals: TrafficCounts;
  readonly daily: readonly (TrafficCounts & { readonly day: string })[];
}
export interface AdminAnalyticsGateway {
  load(days: number, signal: AbortSignal): Promise<TrafficReport>;
}
