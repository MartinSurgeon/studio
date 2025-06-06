export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          check_in_time: string
          class_id: string
          created_at: string
          device_id: string | null
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_latitude: number | null
          verified_longitude: number | null
        }
        Insert: {
          check_in_time: string
          class_id: string
          created_at?: string
          device_id?: string | null
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_latitude?: number | null
          verified_longitude?: number | null
        }
        Update: {
          check_in_time?: string
          class_id?: string
          created_at?: string
          device_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verified_latitude?: number | null
          verified_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active: boolean
          auto_end: boolean
          auto_start: boolean
          created_at: string
          distance_threshold: number
          duration_minutes: number
          end_time: string | null
          grace_period_minutes: number
          id: string
          latitude: number | null
          lecturer_id: string
          longitude: number | null
          name: string
          next_occurrence: string | null
          qr_code_expiry: number | null
          qr_code_value: string | null
          recurrence_pattern: Json | null
          schedule_type: string
          start_time: string
          verification_methods: string[] | null
        }
        Insert: {
          active?: boolean
          auto_end?: boolean
          auto_start?: boolean
          created_at?: string
          distance_threshold?: number
          duration_minutes?: number
          end_time?: string | null
          grace_period_minutes?: number
          id: string
          latitude?: number | null
          lecturer_id: string
          longitude?: number | null
          name: string
          next_occurrence?: string | null
          qr_code_expiry?: number | null
          qr_code_value?: string | null
          recurrence_pattern?: Json | null
          schedule_type?: string
          start_time: string
          verification_methods?: string[] | null
        }
        Update: {
          active?: boolean
          auto_end?: boolean
          auto_start?: boolean
          created_at?: string
          distance_threshold?: number
          duration_minutes?: number
          end_time?: string | null
          grace_period_minutes?: number
          id?: string
          latitude?: number | null
          lecturer_id?: string
          longitude?: number | null
          name?: string
          next_occurrence?: string | null
          qr_code_expiry?: number | null
          qr_code_value?: string | null
          recurrence_pattern?: Json | null
          schedule_type?: string
          start_time?: string
          verification_methods?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          index_number: string | null
          institution_code: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          index_number?: string | null
          institution_code?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          index_number?: string | null
          institution_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_nearby_classes: {
        Args: { lat: number; long: number; max_distance?: number }
        Returns: {
          id: string
          name: string
          distance: number
        }[]
      }
    }
    Enums: {
      attendance_status: "Present" | "Late" | "Absent"
      user_role: "student" | "lecturer"
      verification_method:
        | "QR"
        | "Location"
        | "Manual"
        | "Biometric"
        | "Facial"
        | "NFC"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["Present", "Late", "Absent"],
      user_role: ["student", "lecturer"],
      verification_method: [
        "QR",
        "Location",
        "Manual",
        "Biometric",
        "Facial",
        "NFC",
      ],
    },
  },
} as const
