/**
 * E2AI — cloud bridge. The centralized database is the source of truth for a
 * signed-in, linked student; the localStorage DB is kept only as a mirror so all
 * existing pages keep working unchanged.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadDb, mutate } from "./storage";
import { toast } from "sonner";
import type { LearningGoal, Recommendation, Scores, Session, Student } from "./types";

let cloudUserId: string | null = null;

export interface OfficialStudent {
  student_code: string;
  full_name: string;
  email: string | null;
  school: string | null;
  grade: string | null;
  class_name: string | null;
  linked_user_id: string | null;
  linked_at: string | null;
}

function rowToSession(r: Tables<"practice_sessions">, studentId: string): Session {
  const scores: Scores = {
    fluency: Number(r.fluency_score ?? 0),
    vocabulary: Number(r.vocabulary_score ?? 0),
    grammar: Number(r.grammar_score ?? 0),
    interaction: Number(r.interaction_score ?? 0),
    appropriateness: Number(r.appropriateness_score ?? 0),
  };
  return {
    id: r.id,
    studentId,
    kind:
      r.activity_type === "diagnostic"
        ? "diagnostic"
        : r.activity_type === "posttest"
          ? "posttest"
          : "practice",
    categoryId: r.category_id ?? "",
    categoryLabel: r.category_label ?? "",
    scenario: r.scenario ?? "",
    question: r.question ?? "",
    difficulty: r.difficulty ?? 1,
    suggestedSeconds: r.suggested_seconds ?? 0,
    response: r.response_text ?? "",
    responseTimeSeconds: Number(r.response_time_seconds ?? 0),
    wordCount: r.word_count ?? 0,
    createdAt: r.created_at,
    scores,
    overall: Number(r.overall_score ?? 0),
    audioUrl:
      ((r as Record<string, unknown>)["audio_url"] as string | undefined) ||
      ((r.recommendation as Record<string, unknown>)?.["audioUrl"] as string | undefined),
    feedback: (r.feedback as unknown as string[]) ?? [],
    recommendation: (r.recommendation as unknown as Recommendation) ?? {
      title: "",
      reason: "",
      nextDifficulty: 1,
      difficultyNote: "",
    },
  };
}

/** Loads the linked student's profile + sessions from the database into the local mirror. */
export async function syncLinkedStudent(
  userId: string,
  official: OfficialStudent,
  learningGoal: string | null,
) {
  cloudUserId = userId;
  // Upload any sessions saved on this device that never reached the database.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
  const pending = loadDb().sessions.filter(
    (s) => s.studentId === official.student_code && !s.isDemo && !UUID.test(s.id),
  );
  for (const s of pending) await pushSession(s);
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Không đọc được dữ liệu từ cơ sở dữ liệu online: " + error.message);
  const sessions = (data ?? []).map((r) => rowToSession(r, official.student_code));
  const student: Student = {
    studentId: official.student_code,
    fullName: official.full_name,
    className: official.class_name ?? "",
    school: official.school ?? "",
    learningGoal: (learningGoal as LearningGoal) ?? "General English improvement",
    createdAt: official.linked_at ?? new Date().toISOString(),
  };
  mutate((db) => ({
    ...db,
    students: [
      ...db.students.filter((s) => s.studentId !== student.studentId && !s.isDemo),
      student,
    ],
    sessions: [
      ...db.sessions.filter((s) => s.studentId !== student.studentId && !s.isDemo),
      ...sessions,
    ],
    currentStudentId: student.studentId,
  }));
}

export function clearCloudStudent() {
  cloudUserId = null;
}

/** Writes a session to the database for the signed-in student (demo data never leaves the device). */
export async function pushSession(session: Session): Promise<string | null> {
  if (session.isDemo) return null;
  let targetUserId = cloudUserId;
  if (!targetUserId && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("e2ai_session");
      if (raw) {
        const parsed = JSON.parse(raw) as { auth_user_id?: string; student_code?: string };
        if (parsed.auth_user_id) targetUserId = parsed.auth_user_id;
      }
    } catch {}
  }
  if (!targetUserId && session.studentId) {
    targetUserId = `student-uuid-${session.studentId.toLowerCase()}`;
  }
  if (!targetUserId) return null;
  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      student_id: targetUserId,
      activity_type: session.kind,
      category_id: session.categoryId,
      category_label: session.categoryLabel,
      scenario: session.scenario,
      question: session.question,
      difficulty: session.difficulty,
      suggested_seconds: session.suggestedSeconds,
      response_text: session.response,
      response_time_seconds: session.responseTimeSeconds,
      word_count: session.wordCount,
      overall_score: session.overall,
      fluency_score: session.scores.fluency,
      vocabulary_score: session.scores.vocabulary,
      grammar_score: session.scores.grammar,
      interaction_score: session.scores.interaction,
      appropriateness_score: session.scores.appropriateness,
      feedback: session.feedback,
      recommendation: {
        ...(session.recommendation as Record<string, unknown>),
        ...(session.audioUrl ? { audioUrl: session.audioUrl } : {}),
      } as never,
      status: "completed",
      started_at: session.createdAt,
      completed_at: session.createdAt,
      created_at: session.createdAt,
      ...(session.audioUrl ? { audio_url: session.audioUrl } : {}),
    })
    .select("id")
    .single();
  if (error) {
    toast.error(
      "Chưa lưu được phiên lên cơ sở dữ liệu online. Hệ thống sẽ thử lại khi bạn đăng nhập lại.",
    );
    return null;
  }
  toast.success("Đã lưu phiên luyện tập lên cơ sở dữ liệu online.");
  return data.id;
}

export async function deleteCloudSessions() {
  if (!cloudUserId) return;
  await supabase.from("practice_sessions").delete().eq("student_id", cloudUserId);
}

export { rowToSession };
