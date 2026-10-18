/**
 * E2AI V1 — transparent adaptive recommendation rules (section 14).
 * Every recommendation carries a Vietnamese explanation of WHY.
 */

import type { Recommendation, Scores, Session, SkillKey } from "./types";
import { overallScore } from "./scoring";

export interface AdaptiveInput {
  latestScores: Scores;
  latestOverall: number;
  latestResponseTime: number;
  /** Average response time across the student's recent sessions */
  avgResponseTime: number;
  /** Overall scores of the latest 3 completed sessions (newest first) */
  lastThreeOverall: number[];
  currentDifficulty: number;
}

export function buildRecommendation(input: AdaptiveInput): Recommendation {
  const { latestScores, latestOverall, avgResponseTime, lastThreeOverall, currentDifficulty } =
    input;

  let title = "Balanced Practice";
  let reason = `Điểm tổng thể gần nhất của bạn là ${latestOverall.toFixed(1)}/5 và các kỹ năng khá đều. E2AI đề xuất luyện tập cân bằng các chủ đề.`;

  // RULE 1 — response speed
  if (avgResponseTime > 7) {
    title = "Rapid Response Practice";
    reason = `Thời gian phản hồi trung bình của bạn là ${avgResponseTime.toFixed(1)} giây (> 7 giây). E2AI đề xuất luyện phản xạ nhanh.`;
  }
  // RULE 4 — fluency
  else if (latestScores.fluency < 3) {
    title = "Extended Speaking Practice";
    reason = `Điểm Fluency gần nhất là ${latestScores.fluency}/5 (< 3). E2AI đề xuất luyện mở rộng câu trả lời.`;
  }
  // RULE 2 — vocabulary
  else if (latestScores.vocabulary < 3) {
    title = "Vocabulary Expansion Practice";
    reason = `Điểm Vocabulary gần nhất là ${latestScores.vocabulary}/5 (< 3). E2AI đề xuất luyện mở rộng từ vựng theo chủ đề.`;
  }
  // RULE 3 — interaction
  else if (latestScores.interaction < 3) {
    title = "Follow-up & Interaction Practice";
    reason = `Điểm Interaction gần nhất là ${latestScores.interaction}/5 (< 3). E2AI đề xuất luyện dùng từ nối và câu hỏi phản hồi.`;
  }
  // RULE 5 — grammar
  else if (latestScores.grammar < 3) {
    title = "Sentence Building Practice";
    reason = `Điểm Grammar gần nhất là ${latestScores.grammar}/5 (< 3). E2AI đề xuất luyện dựng câu đầy đủ.`;
  }

  // RULES 6-8 — difficulty
  let nextDifficulty = currentDifficulty;
  let difficultyNote = `Giữ nguyên độ khó Level ${currentDifficulty} vì điểm tổng thể nằm trong khoảng 2.5 – 4.0.`;

  const threeGood =
    lastThreeOverall.length >= 3 && lastThreeOverall.slice(0, 3).every((v) => v >= 4.0);
  if (threeGood) {
    nextDifficulty = Math.min(4, currentDifficulty + 1);
    difficultyNote = `3 phiên gần nhất đều đạt ≥ 4.0. E2AI tăng độ khó đề xuất lên Level ${nextDifficulty}.`;
  } else if (latestOverall < 2.5) {
    nextDifficulty = currentDifficulty;
    difficultyNote = `Điểm phiên gần nhất là ${latestOverall.toFixed(1)} (< 2.5). E2AI đề xuất luyện lại Level ${currentDifficulty} với hỗ trợ thêm (gợi ý từ nối, mẫu câu).`;
  } else if (latestOverall > 4.0) {
    difficultyNote = `Điểm phiên gần nhất là ${latestOverall.toFixed(1)}. Hãy hoàn thành thêm phiên ≥ 4.0 để E2AI tăng độ khó.`;
  }

  return { title, reason, nextDifficulty, difficultyNote };
}

/** Compute adaptive input from a student's stored sessions (newest first). */
export function recommendationFromSessions(sessions: Session[]): Recommendation | null {
  if (sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = sorted[0]!;
  const recent = sorted.slice(0, 5);
  const avgResponseTime = recent.reduce((s, x) => s + x.responseTimeSeconds, 0) / recent.length;
  return buildRecommendation({
    latestScores: latest.scores,
    latestOverall: overallScore(latest.scores),
    latestResponseTime: latest.responseTimeSeconds,
    avgResponseTime,
    lastThreeOverall: sorted.slice(0, 3).map((s) => s.overall),
    currentDifficulty: latest.difficulty,
  });
}

export function weakestSkill(sessions: Session[]): { skill: SkillKey; avg: number } | null {
  if (sessions.length === 0) return null;
  const keys: SkillKey[] = ["fluency", "vocabulary", "grammar", "interaction", "appropriateness"];
  const averages = keys.map((k) => ({
    skill: k,
    avg: sessions.reduce((s, x) => s + x.scores[k], 0) / sessions.length,
  }));
  averages.sort((a, b) => a.avg - b.avg);
  return averages[0]!;
}

export function strongestSkill(sessions: Session[]): { skill: SkillKey; avg: number } | null {
  const keys: SkillKey[] = ["fluency", "vocabulary", "grammar", "interaction", "appropriateness"];
  if (sessions.length === 0) return null;
  const averages = keys.map((k) => ({
    skill: k,
    avg: sessions.reduce((s, x) => s + x.scores[k], 0) / sessions.length,
  }));
  averages.sort((a, b) => b.avg - a.avg);
  return averages[0]!;
}

export function skillAverages(sessions: Session[]): Record<SkillKey, number> {
  const keys: SkillKey[] = ["fluency", "vocabulary", "grammar", "interaction", "appropriateness"];
  const out = {} as Record<SkillKey, number>;
  for (const k of keys) {
    out[k] = sessions.length
      ? Math.round((sessions.reduce((s, x) => s + x.scores[k], 0) / sessions.length) * 10) / 10
      : 0;
  }
  return out;
}
