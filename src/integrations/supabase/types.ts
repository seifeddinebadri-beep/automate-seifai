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
      activity_metrics: {
        Row: {
          activity: string
          avg_duration: number | null
          avg_waiting_time: number | null
          created_at: string
          dataset_id: string
          frequency: number
          id: string
          max_duration: number | null
          min_duration: number | null
          repetition_rate: number | null
          rework_count: number | null
          std_deviation: number | null
          unique_cases: number | null
          updated_at: string
        }
        Insert: {
          activity: string
          avg_duration?: number | null
          avg_waiting_time?: number | null
          created_at?: string
          dataset_id: string
          frequency?: number
          id?: string
          max_duration?: number | null
          min_duration?: number | null
          repetition_rate?: number | null
          rework_count?: number | null
          std_deviation?: number | null
          unique_cases?: number | null
          updated_at?: string
        }
        Update: {
          activity?: string
          avg_duration?: number | null
          avg_waiting_time?: number | null
          created_at?: string
          dataset_id?: string
          frequency?: number
          id?: string
          max_duration?: number | null
          min_duration?: number | null
          repetition_rate?: number | null
          rework_count?: number | null
          std_deviation?: number | null
          unique_cases?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_metrics_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_use_cases: {
        Row: {
          affected_activities: string[]
          ai_classification: string | null
          ai_explanation: string | null
          complexity: string
          confidence_score: number
          created_at: string
          dataset_id: string
          description: string | null
          estimated_cost_impact: number | null
          estimated_time_saved: number
          id: string
          monthly_volume: number
          name: string
          pattern_type: string
          priority_score: number | null
          status: string | null
          suggested_approach: string | null
          type: string
          updated_at: string
        }
        Insert: {
          affected_activities: string[]
          ai_classification?: string | null
          ai_explanation?: string | null
          complexity: string
          confidence_score?: number
          created_at?: string
          dataset_id: string
          description?: string | null
          estimated_cost_impact?: number | null
          estimated_time_saved?: number
          id?: string
          monthly_volume?: number
          name: string
          pattern_type: string
          priority_score?: number | null
          status?: string | null
          suggested_approach?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          affected_activities?: string[]
          ai_classification?: string | null
          ai_explanation?: string | null
          complexity?: string
          confidence_score?: number
          created_at?: string
          dataset_id?: string
          description?: string | null
          estimated_cost_impact?: number | null
          estimated_time_saved?: number
          id?: string
          monthly_volume?: number
          name?: string
          pattern_type?: string
          priority_score?: number | null
          status?: string | null
          suggested_approach?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_use_cases_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          id: string
          name: string
          row_count: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          id?: string
          name: string
          row_count?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          id?: string
          name?: string
          row_count?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      process_events: {
        Row: {
          activity: string
          case_id: string
          created_at: string
          dataset_id: string
          duration: number | null
          id: string
          system: string | null
          timestamp: string
          user_role: string | null
        }
        Insert: {
          activity: string
          case_id: string
          created_at?: string
          dataset_id: string
          duration?: number | null
          id?: string
          system?: string | null
          timestamp: string
          user_role?: string | null
        }
        Update: {
          activity?: string
          case_id?: string
          created_at?: string
          dataset_id?: string
          duration?: number | null
          id?: string
          system?: string | null
          timestamp?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_events_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
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
