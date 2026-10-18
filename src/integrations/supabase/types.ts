export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      class_members: {
        Row: {
          class_id: string;
          id: string;
          joined_at: string;
          student_id: string;
        };
        Insert: {
          class_id: string;
          id?: string;
          joined_at?: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          id?: string;
          joined_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          academic_year: string | null;
          class_code: string;
          class_name: string;
          created_at: string;
          id: string;
          school: string | null;
          teacher_id: string;
        };
        Insert: {
          academic_year?: string | null;
          class_code: string;
          class_name: string;
          created_at?: string;
          id?: string;
          school?: string | null;
          teacher_id: string;
        };
        Update: {
          academic_year?: string | null;
          class_code?: string;
          class_name?: string;
          created_at?: string;
          id?: string;
          school?: string | null;
          teacher_id?: string;
        };
        Relationships: [];
      };
      development_logs: {
        Row: {
          author: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          entry_date: string;
          id: string;
          problem: string | null;
          result: string | null;
          solution: string | null;
          stage: string | null;
          title: string;
          version: string | null;
        };
        Insert: {
          author?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          entry_date?: string;
          id?: string;
          problem?: string | null;
          result?: string | null;
          solution?: string | null;
          stage?: string | null;
          title: string;
          version?: string | null;
        };
        Update: {
          author?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          entry_date?: string;
          id?: string;
          problem?: string | null;
          result?: string | null;
          solution?: string | null;
          stage?: string | null;
          title?: string;
          version?: string | null;
        };
        Relationships: [];
      };
      learning_progress: {
        Row: {
          favorite: boolean;
          id: string;
          learned: boolean;
          resource_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          favorite?: boolean;
          id?: string;
          learned?: boolean;
          resource_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          favorite?: boolean;
          id?: string;
          learned?: boolean;
          resource_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_progress_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "learning_resources";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_resources: {
        Row: {
          created_at: string;
          created_by: string | null;
          example: string | null;
          function_label: string | null;
          id: string;
          level: string;
          meaning: string | null;
          notes: string | null;
          part_of_speech: string | null;
          published: boolean;
          resource_type: string;
          title: string;
          topic_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          example?: string | null;
          function_label?: string | null;
          id?: string;
          level?: string;
          meaning?: string | null;
          notes?: string | null;
          part_of_speech?: string | null;
          published?: boolean;
          resource_type: string;
          title: string;
          topic_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          example?: string | null;
          function_label?: string | null;
          id?: string;
          level?: string;
          meaning?: string | null;
          notes?: string | null;
          part_of_speech?: string | null;
          published?: boolean;
          resource_type?: string;
          title?: string;
          topic_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_resources_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "learning_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_topics: {
        Row: {
          created_at: string;
          id: string;
          practice_category: string | null;
          sort_order: number;
          title: string;
          title_vi: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          practice_category?: string | null;
          sort_order?: number;
          title: string;
          title_vi?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          practice_category?: string | null;
          sort_order?: number;
          title?: string;
          title_vi?: string | null;
        };
        Relationships: [];
      };
      official_students: {
        Row: {
          class_name: string | null;
          email: string | null;
          full_name: string;
          grade: string | null;
          linked_at: string | null;
          linked_user_id: string | null;
          school: string | null;
          student_code: string;
          updated_at: string;
        };
        Insert: {
          class_name?: string | null;
          email?: string | null;
          full_name: string;
          grade?: string | null;
          linked_at?: string | null;
          linked_user_id?: string | null;
          school?: string | null;
          student_code: string;
          updated_at?: string;
        };
        Update: {
          class_name?: string | null;
          email?: string | null;
          full_name?: string;
          grade?: string | null;
          linked_at?: string | null;
          linked_user_id?: string | null;
          school?: string | null;
          student_code?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      official_teacher: {
        Row: {
          email: string | null;
          full_name: string;
          id: number;
          linked_at: string | null;
          linked_user_id: string | null;
          school: string | null;
          subject: string | null;
        };
        Insert: {
          email?: string | null;
          full_name: string;
          id?: number;
          linked_at?: string | null;
          linked_user_id?: string | null;
          school?: string | null;
          subject?: string | null;
        };
        Update: {
          email?: string | null;
          full_name?: string;
          id?: number;
          linked_at?: string | null;
          linked_user_id?: string | null;
          school?: string | null;
          subject?: string | null;
        };
        Relationships: [];
      };
      practice_sessions: {
        Row: {
          activity_type: string;
          ai_feedback: Json | null;
          appropriateness_score: number | null;
          category_id: string | null;
          category_label: string | null;
          class_id: string | null;
          completed_at: string | null;
          created_at: string;
          difficulty: number | null;
          duration_seconds: number | null;
          feedback: Json | null;
          fluency_score: number | null;
          grammar_score: number | null;
          id: string;
          interaction_score: number | null;
          overall_score: number | null;
          pronunciation_score: number | null;
          question: string | null;
          recommendation: Json | null;
          response_text: string | null;
          response_time_seconds: number | null;
          scenario: string | null;
          started_at: string;
          status: string;
          student_id: string;
          suggested_seconds: number | null;
          topic: string | null;
          turn_count: number;
          vocabulary_score: number | null;
          word_count: number | null;
        };
        Insert: {
          activity_type?: string;
          ai_feedback?: Json | null;
          appropriateness_score?: number | null;
          category_id?: string | null;
          category_label?: string | null;
          class_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          difficulty?: number | null;
          duration_seconds?: number | null;
          feedback?: Json | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          interaction_score?: number | null;
          overall_score?: number | null;
          pronunciation_score?: number | null;
          question?: string | null;
          recommendation?: Json | null;
          response_text?: string | null;
          response_time_seconds?: number | null;
          scenario?: string | null;
          started_at?: string;
          status?: string;
          student_id: string;
          suggested_seconds?: number | null;
          topic?: string | null;
          turn_count?: number;
          vocabulary_score?: number | null;
          word_count?: number | null;
        };
        Update: {
          activity_type?: string;
          ai_feedback?: Json | null;
          appropriateness_score?: number | null;
          category_id?: string | null;
          category_label?: string | null;
          class_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          difficulty?: number | null;
          duration_seconds?: number | null;
          feedback?: Json | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          interaction_score?: number | null;
          overall_score?: number | null;
          pronunciation_score?: number | null;
          question?: string | null;
          recommendation?: Json | null;
          response_text?: string | null;
          response_time_seconds?: number | null;
          scenario?: string | null;
          started_at?: string;
          status?: string;
          student_id?: string;
          suggested_seconds?: number | null;
          topic?: string | null;
          turn_count?: number;
          vocabulary_score?: number | null;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "practice_sessions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_turns: {
        Row: {
          ai_response: string | null;
          created_at: string;
          fluency_feedback: string | null;
          grammar_feedback: string | null;
          id: string;
          pronunciation_feedback: string | null;
          session_id: string;
          speaker: string;
          student_id: string;
          transcript: string | null;
          turn_number: number;
          vocabulary_feedback: string | null;
        };
        Insert: {
          ai_response?: string | null;
          created_at?: string;
          fluency_feedback?: string | null;
          grammar_feedback?: string | null;
          id?: string;
          pronunciation_feedback?: string | null;
          session_id: string;
          speaker: string;
          student_id: string;
          transcript?: string | null;
          turn_number: number;
          vocabulary_feedback?: string | null;
        };
        Update: {
          ai_response?: string | null;
          created_at?: string;
          fluency_feedback?: string | null;
          grammar_feedback?: string | null;
          id?: string;
          pronunciation_feedback?: string | null;
          session_id?: string;
          speaker?: string;
          student_id?: string;
          transcript?: string | null;
          turn_number?: number;
          vocabulary_feedback?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "practice_turns_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "practice_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          class_name: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          learning_goal: string | null;
          profile_completed: boolean;
          role: Database["public"]["Enums"]["app_role"];
          school: string | null;
          student_code: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          class_name?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          learning_goal?: string | null;
          profile_completed?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          school?: string | null;
          student_code?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          class_name?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          learning_goal?: string | null;
          profile_completed?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          school?: string | null;
          student_code?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      prototype_tests: {
        Row: {
          actual_result: string | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          expected_result: string | null;
          id: string;
          notes: string | null;
          solution: string | null;
          status: string;
          test_case: string;
          test_category: string;
          test_code: string | null;
          test_date: string;
          tester: string | null;
          version: string | null;
        };
        Insert: {
          actual_result?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          expected_result?: string | null;
          id?: string;
          notes?: string | null;
          solution?: string | null;
          status?: string;
          test_case: string;
          test_category: string;
          test_code?: string | null;
          test_date?: string;
          tester?: string | null;
          version?: string | null;
        };
        Update: {
          actual_result?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          expected_result?: string | null;
          id?: string;
          notes?: string | null;
          solution?: string | null;
          status?: string;
          test_case?: string;
          test_category?: string;
          test_code?: string | null;
          test_date?: string;
          tester?: string | null;
          version?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      e2ai_norm_name: { Args: { _s: string }; Returns: string };
      find_official_student: {
        Args: { _name: string };
        Returns: {
          class_name: string;
          full_name: string;
          is_linked: boolean;
          student_code: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_class_member: {
        Args: { _class: string; _user: string };
        Returns: boolean;
      };
      join_class_by_code: { Args: { _code: string }; Returns: string };
      link_official_student: {
        Args: { _code: string; _full_name: string };
        Returns: string;
      };
      link_official_teacher: { Args: never; Returns: boolean };
      owns_class: { Args: { _class: string; _user: string }; Returns: boolean };
      teaches_student: {
        Args: { _student: string; _teacher: string };
        Returns: boolean;
      };
      unlink_official_student: { Args: { _code: string }; Returns: undefined };
    };
    Enums: {
      app_role: "student" | "teacher";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher"],
    },
  },
} as const;
