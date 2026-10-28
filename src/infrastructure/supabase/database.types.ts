export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      game_saves: {
        Row: {
          epoch: number;
          revision: number;
          save: Json;
          updated_at: string;
          user_id: string;
          write_id: string;
        };
        Insert: {
          epoch?: number;
          revision: number;
          save: Json;
          updated_at?: string;
          user_id: string;
          write_id?: string;
        };
        Update: {
          epoch?: number;
          revision?: number;
          save?: Json;
          updated_at?: string;
          user_id?: string;
          write_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_saves_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      player_progress: {
        Row: {
          automation: number;
          captain_name: string;
          credits: number;
          prestige: number;
          depth_m: number;
          id: string;
          outposts: number;
          research: number;
          updated_at: string;
          upgrades: number;
        };
        Insert: {
          automation?: number;
          captain_name: string;
          credits?: number;
          prestige?: number;
          depth_m?: number;
          id: string;
          outposts?: number;
          research?: number;
          updated_at?: string;
          upgrades?: number;
        };
        Update: {
          automation?: number;
          captain_name?: string;
          credits?: number;
          prestige?: number;
          depth_m?: number;
          id?: string;
          outposts?: number;
          research?: number;
          updated_at?: string;
          upgrades?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'player_progress_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          automation: number | null;
          captain_name: string | null;
          credits: number | null;
          prestige: number | null;
          depth_m: number | null;
          id: string | null;
          outposts: number | null;
          position: number | null;
          research: number | null;
          total_players: number | null;
          updated_at: string | null;
          upgrades: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'player_progress_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      admin_overview: { Args: never; Returns: Json };
      admin_database: {
        Args: {
          filter_text?: string;
          page_index?: number;
          table_name?: string;
        };
        Returns: Json;
      };
      is_database_admin: { Args: never; Returns: boolean };
      prestige_game_save: {
        Args: {
          account_id: string;
          payload: Json;
          operation_id: string;
          expected_epoch: number;
          expected_revision: number;
          expected_rank: number;
        };
        Returns: Database['public']['Tables']['game_saves']['Row'][];
      };
      reset_game_save: {
        Args: { account_id: string; payload: Json; operation_id: string };
        Returns: Database['public']['Tables']['game_saves']['Row'][];
      };
      write_game_save: {
        Args: {
          account_id: string;
          expected_epoch?: number;
          expected_revision: number;
          operation_id: string;
          payload: Json;
        };
        Returns: {
          epoch: number;
          revision: number;
          save: Json;
          updated_at: string;
          user_id: string;
          write_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'game_saves';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type SaveRow = Database['public']['Tables']['game_saves']['Row'];
