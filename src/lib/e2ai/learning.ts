import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Topic = Tables<"learning_topics">;
export type Resource = Tables<"learning_resources">;
export type Progress = Tables<"learning_progress">;
export type ResourceType = "vocabulary" | "structure" | "pattern" | "idea";
export type LearnStatus = "not_started" | "learning" | "learned";

export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const TYPE_LABELS: Record<ResourceType, string> = {
  vocabulary: "Từ vựng",
  structure: "Cấu trúc",
  pattern: "Mẫu câu giao tiếp",
  idea: "Gợi ý nói",
};
export const STATUS_LABELS: Record<LearnStatus, string> = {
  not_started: "Chưa học",
  learning: "Đang học",
  learned: "Đã học",
};

const KEY = ["e2ai", "learning"];

import { SEED_LEARNING_RESOURCES, SEED_LEARNING_TOPICS } from "./content";

export function useLearningData() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      try {
        const [t, r] = await Promise.all([
          supabase.from("learning_topics").select("*").order("sort_order"),
          supabase.from("learning_resources").select("*").order("created_at"),
        ]);
        const topics =
          t.data && t.data.length > 0 ? t.data : (SEED_LEARNING_TOPICS as unknown as Topic[]);
        const resources =
          r.data && r.data.length > 0 ? r.data : (SEED_LEARNING_RESOURCES as unknown as Resource[]);
        return { topics, resources };
      } catch (err) {
        console.warn("[Learning Data] Using offline seed data:", err);
        return {
          topics: SEED_LEARNING_TOPICS as unknown as Topic[],
          resources: SEED_LEARNING_RESOURCES as unknown as Resource[],
        };
      }
    },
  });
}

export function useMyProgress(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useAllProgress(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "progress-all"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_progress").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useSetProgress(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      resource_id: string;
      favorite?: boolean;
      status?: LearnStatus;
      current?: Progress | undefined;
    }) => {
      const row = {
        user_id: userId!,
        resource_id: p.resource_id,
        favorite: p.favorite ?? p.current?.favorite ?? false,
        status: p.status ?? p.current?.status ?? "not_started",
        learned: (p.status ?? p.current?.status) === "learned",
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("learning_progress")
        .upsert(row, { onConflict: "user_id,resource_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, "progress"] }),
  });
}

export function useInvalidateLearning() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}
