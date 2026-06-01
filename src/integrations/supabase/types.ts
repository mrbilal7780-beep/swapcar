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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      matches: {
        Row: {
          created_at: string
          id: string
          user_a_id: string
          user_b_id: string
          vehicle_a_id: string
          vehicle_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a_id: string
          user_b_id: string
          vehicle_a_id: string
          vehicle_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a_id?: string
          user_b_id?: string
          vehicle_a_id?: string
          vehicle_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_vehicle_a_id_fkey"
            columns: ["vehicle_a_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_vehicle_b_id_fkey"
            columns: ["vehicle_b_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          trust_score: number
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          trust_score?: number
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          trust_score?: number
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      vehicle_likes: {
        Row: {
          created_at: string
          id: string
          liked_vehicle_id: string
          liker_user_id: string
          liker_vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_vehicle_id: string
          liker_user_id: string
          liker_vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_vehicle_id?: string
          liker_user_id?: string
          liker_vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_likes_liked_vehicle_id_fkey"
            columns: ["liked_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_likes_liker_vehicle_id_fkey"
            columns: ["liker_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          ai_body_score: number | null
          ai_estimate: number | null
          ai_interior_score: number | null
          ai_issues: Json | null
          ai_mechanical_score: number | null
          ai_summary: string | null
          body_type: string | null
          brand: string
          city: string | null
          color: string | null
          condition: string | null
          created_at: string
          cylinders: number | null
          description: string | null
          displacement_cc: number | null
          doors: number | null
          drivetrain: string | null
          first_registration: string | null
          fuel: string
          gears: number | null
          generation: string | null
          id: string
          mileage: number
          model: string
          owner_id: string
          owners_count: number | null
          photos: string[]
          power_hp: number | null
          price: number
          seats: number | null
          status: string
          transmission: string
          updated_at: string
          year: number
        }
        Insert: {
          ai_body_score?: number | null
          ai_estimate?: number | null
          ai_interior_score?: number | null
          ai_issues?: Json | null
          ai_mechanical_score?: number | null
          ai_summary?: string | null
          body_type?: string | null
          brand: string
          city?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          cylinders?: number | null
          description?: string | null
          displacement_cc?: number | null
          doors?: number | null
          drivetrain?: string | null
          first_registration?: string | null
          fuel: string
          gears?: number | null
          generation?: string | null
          id?: string
          mileage: number
          model: string
          owner_id: string
          owners_count?: number | null
          photos?: string[]
          power_hp?: number | null
          price: number
          seats?: number | null
          status?: string
          transmission: string
          updated_at?: string
          year: number
        }
        Update: {
          ai_body_score?: number | null
          ai_estimate?: number | null
          ai_interior_score?: number | null
          ai_issues?: Json | null
          ai_mechanical_score?: number | null
          ai_summary?: string | null
          body_type?: string | null
          brand?: string
          city?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          cylinders?: number | null
          description?: string | null
          displacement_cc?: number | null
          doors?: number | null
          drivetrain?: string | null
          first_registration?: string | null
          fuel?: string
          gears?: number | null
          generation?: string | null
          id?: string
          mileage?: number
          model?: string
          owner_id?: string
          owners_count?: number | null
          photos?: string[]
          power_hp?: number | null
          price?: number
          seats?: number | null
          status?: string
          transmission?: string
          updated_at?: string
          year?: number
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
