export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          latitude: number | null;
          longitude: number | null;
          distance_threshold: number;
          start_time: string;
          end_time: string | null;
          active: boolean;
          lecturer_id: string;
          qr_code_value: string | null;
          qr_code_expiry: number | null;
          created_at: string;
          schedule_type: string;
          recurrence_pattern: any | null;
          duration_minutes: number;
          grace_period_minutes: number;
          auto_start: boolean;
          auto_end: boolean;
          next_occurrence: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          latitude?: number | null;
          longitude?: number | null;
          distance_threshold: number;
          start_time: string;
          end_time?: string | null;
          active: boolean;
          lecturer_id: string;
          qr_code_value?: string | null;
          qr_code_expiry?: number | null;
          created_at?: string;
          schedule_type?: string;
          recurrence_pattern?: any | null;
          duration_minutes?: number;
          grace_period_minutes?: number;
          auto_start?: boolean;
          auto_end?: boolean;
          next_occurrence?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          latitude?: number | null;
          longitude?: number | null;
          distance_threshold?: number;
          start_time?: string;
          end_time?: string | null;
          active?: boolean;
          lecturer_id?: string;
          qr_code_value?: string | null;
          qr_code_expiry?: number | null;
          created_at?: string;
          schedule_type?: string;
          recurrence_pattern?: any | null;
          duration_minutes?: number;
          grace_period_minutes?: number;
          auto_start?: boolean;
          auto_end?: boolean;
          next_occurrence?: string | null;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          check_in_time: string;
          status: 'Present' | 'Late' | 'Absent';
          verification_method: 'QR' | 'Location' | 'Manual' | 'Biometric' | 'Facial' | 'NFC';
          verified_latitude: number | null;
          verified_longitude: number | null;
          created_at: string;
          device_id: string | null;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          check_in_time: string;
          status: 'Present' | 'Late' | 'Absent';
          verification_method: 'QR' | 'Location' | 'Manual' | 'Biometric' | 'Facial' | 'NFC';
          verified_latitude?: number | null;
          verified_longitude?: number | null;
          created_at?: string;
          device_id?: string | null;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          check_in_time?: string;
          status?: 'Present' | 'Late' | 'Absent';
          verification_method?: 'QR' | 'Location' | 'Manual' | 'Biometric' | 'Facial' | 'NFC';
          verified_latitude?: number | null;
          verified_longitude?: number | null;
          created_at?: string;
          device_id?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: 'student' | 'lecturer';
          index_number?: string | null;
          institution_code?: string | null;
          display_name?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'student' | 'lecturer';
          index_number?: string | null;
          institution_code?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'student' | 'lecturer';
          index_number?: string | null;
          institution_code?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      attendance_status: 'Present' | 'Late' | 'Absent';
      verification_method: 'QR' | 'Location' | 'Manual' | 'Biometric' | 'Facial' | 'NFC';
      user_role: 'student' | 'lecturer';
    };
  };
}

// Helper types for your application logic
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertDTO<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDTO<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']; 