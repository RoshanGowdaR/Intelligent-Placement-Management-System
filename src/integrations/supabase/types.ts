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
      admin_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          allowed_branches: string[] | null
          bond_details: string | null
          contact_info: Json | null
          created_at: string
          description: string | null
          eligibility_criteria: Json | null
          id: string
          job_location: string | null
          job_role: string | null
          job_type: string | null
          max_backlogs: number | null
          name: string
          requirements: string[] | null
          salary_package: string | null
          selection_process: string[] | null
          skills_priority: Json | null
          test_date: string | null
          updated_at: string
        }
        Insert: {
          allowed_branches?: string[] | null
          bond_details?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          eligibility_criteria?: Json | null
          id?: string
          job_location?: string | null
          job_role?: string | null
          job_type?: string | null
          max_backlogs?: number | null
          name: string
          requirements?: string[] | null
          salary_package?: string | null
          selection_process?: string[] | null
          skills_priority?: Json | null
          test_date?: string | null
          updated_at?: string
        }
        Update: {
          allowed_branches?: string[] | null
          bond_details?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          eligibility_criteria?: Json | null
          id?: string
          job_location?: string | null
          job_role?: string | null
          job_type?: string | null
          max_backlogs?: number | null
          name?: string
          requirements?: string[] | null
          salary_package?: string | null
          selection_process?: string[] | null
          skills_priority?: Json | null
          test_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          cgpa: number | null
          created_at: string
          current_semester: number | null
          email: string | null
          id: string
          is_lateral_entry: boolean | null
          marks_cards: Json | null
          name: string | null
          profile_completion_percentage: number | null
          resume_url: string | null
          sgpas: Json | null
          skills: string[] | null
          updated_at: string
          usn: string | null
          year_of_passing: number | null
        }
        Insert: {
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          current_semester?: number | null
          email?: string | null
          id: string
          is_lateral_entry?: boolean | null
          marks_cards?: Json | null
          name?: string | null
          profile_completion_percentage?: number | null
          resume_url?: string | null
          sgpas?: Json | null
          skills?: string[] | null
          updated_at?: string
          usn?: string | null
          year_of_passing?: number | null
        }
        Update: {
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          current_semester?: number | null
          email?: string | null
          id?: string
          is_lateral_entry?: boolean | null
          marks_cards?: Json | null
          name?: string | null
          profile_completion_percentage?: number | null
          resume_url?: string | null
          sgpas?: Json | null
          skills?: string[] | null
          updated_at?: string
          usn?: string | null
          year_of_passing?: number | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["schedule_status"]
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          student_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          auto_submitted: boolean
          completed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          passed: boolean | null
          proctor_events: Json | null
          retake_reason: string | null
          scores: Json | null
          started_at: string | null
          student_id: string
          tab_switches: number
          test_id: string
          total_score: number | null
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number
          auto_submitted?: boolean
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          passed?: boolean | null
          proctor_events?: Json | null
          retake_reason?: string | null
          scores?: Json | null
          started_at?: string | null
          student_id: string
          tab_switches?: number
          test_id: string
          total_score?: number | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          auto_submitted?: boolean
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          passed?: boolean | null
          proctor_events?: Json | null
          retake_reason?: string | null
          scores?: Json | null
          started_at?: string | null
          student_id?: string
          tab_switches?: number
          test_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          duration: number
          id: string
          max_participants: number | null
          pass_criteria: Json | null
          proctor_config: Json | null
          question_bank: Json | null
          questions_per_student: number | null
          retake_question_bank: Json | null
          scheduled_date: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          max_participants?: number | null
          pass_criteria?: Json | null
          proctor_config?: Json | null
          question_bank?: Json | null
          questions_per_student?: number | null
          retake_question_bank?: Json | null
          scheduled_date: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          max_participants?: number | null
          pass_criteria?: Json | null
          proctor_config?: Json | null
          question_bank?: Json | null
          questions_per_student?: number | null
          retake_question_bank?: Json | null
          scheduled_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "company"
      schedule_status: "registered" | "completed" | "missed"
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
    Enums: {
      app_role: ["admin", "student"],
      schedule_status: ["registered", "completed", "missed"],
    },
  },
} as const
