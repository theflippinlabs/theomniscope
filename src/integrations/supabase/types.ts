export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          chain: string
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          name: string
          rule_type: string
          scope: string
          severity: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chain?: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          name: string
          rule_type: string
          scope: string
          severity?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chain?: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          name?: string
          rule_type?: string
          scope?: string
          severity?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alert_state: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      alerts: {
        Row: {
          chain: string
          created_at: string
          description: string
          evidence: Json
          id: string
          rule_id: string | null
          scope: string
          severity: string
          status: string
          subject: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          chain?: string
          created_at?: string
          description?: string
          evidence?: Json
          id?: string
          rule_id?: string | null
          scope: string
          severity?: string
          status?: string
          subject?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          chain?: string
          created_at?: string
          description?: string
          evidence?: Json
          id?: string
          rule_id?: string | null
          scope?: string
          severity?: string
          status?: string
          subject?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_edges: {
        Row: {
          cluster_id: string
          created_at: string
          id: string
          net_flow: number
          source_address: string
          target_address: string
          time_window: string
          tx_count: number
          weight: number
        }
        Insert: {
          cluster_id: string
          created_at?: string
          id?: string
          net_flow?: number
          source_address: string
          target_address: string
          time_window?: string
          tx_count?: number
          weight?: number
        }
        Update: {
          cluster_id?: string
          created_at?: string
          id?: string
          net_flow?: number
          source_address?: string
          target_address?: string
          time_window?: string
          tx_count?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "cluster_edges_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_members: {
        Row: {
          address: string
          cluster_id: string
          confidence: number
          created_at: string
          id: string
          reasons: Json
          role: string
        }
        Insert: {
          address: string
          cluster_id: string
          confidence?: number
          created_at?: string
          id?: string
          reasons?: Json
          role?: string
        }
        Update: {
          address?: string
          cluster_id?: string
          confidence?: number
          created_at?: string
          id?: string
          reasons?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          chain: string
          confidence: number
          created_at: string
          id: string
          label: string | null
          member_count: number
          seed_address: string
          seed_type: string
          top_signals: Json
          updated_at: string
        }
        Insert: {
          chain?: string
          confidence?: number
          created_at?: string
          id?: string
          label?: string | null
          member_count?: number
          seed_address: string
          seed_type?: string
          top_signals?: Json
          updated_at?: string
        }
        Update: {
          chain?: string
          confidence?: number
          created_at?: string
          id?: string
          label?: string | null
          member_count?: number
          seed_address?: string
          seed_type?: string
          top_signals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          device_id: string | null
          id: string
          is_used: boolean
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          device_id?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          device_id?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          chain: string
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          subject: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chain?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          subject: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chain?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
