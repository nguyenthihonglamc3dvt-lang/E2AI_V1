/**
 * E2AI V1 — transparent rule-based scoring ("E2AI Prototype Score").
 *
 * These rules are intentionally simple and fully inspectable. They are prototype
 * indicators for a student research project, NOT validated language assessment.
 *
 * V2 EXTENSION POINT
 * ------------------
 * A future version could send { response, question } to an AI provider (via a
 * server function so no key is exposed in the browser) and merge the returned
 * analysis alongside these rule scores — keeping both visible so the research
 * team can compare rule-based vs AI-based indicators.
 */

import type { Scores, SkillKey } from "./types";

export const SKILL_LABELS: Record<SkillKey, string> = {
  fluency: "Fluency (Độ trôi chảy)",
  vocabulary: "Vocabulary (Từ vựng)",
  grammar: "Grammar (Ngữ pháp)",
  interaction: "Interaction (Tương tác)",
  appropriateness: "Appropriateness (Phù hợp)",
};

export const SKILL_SHORT: Record<SkillKey, string> = {
  fluency: "Fluency",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  interaction: "Interaction",
  appropriateness: "Appropriateness",
};

export const INTERACTION_MARKERS = [
  "because",
  "but",
  "so",
  "however",
  "also",
  "maybe",
  "should",
  "could",
  "why",
  "what",
  "how",
  "i think",
  "in my opinion",
];

const SUBJECT_WORDS = [
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "his",
  "her",
  "their",
  "our",
  "this",
  "that",
  "there",
  "people",
  "students",
  "friend",
];

const VERB_WORDS = [
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
  "should",
  "go",
  "goes",
  "went",
  "think",
  "want",
  "like",
  "need",
  "say",
  "said",
  "tell",
  "help",
  "study",
  "learn",
  "make",
  "get",
  "take",
  "feel",
  "try",
  "ask",
  "talk",
  "use",
  "know",
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function countWords(text: string): number {
  return tokenize(text).length;
}

/** FLUENCY — response length band, adjusted for meaningful content. */
export function scoreFluency(text: string): number {
  const words = tokenize(text);
  const n = words.length;
  let score = n <= 4 ? 1 : n <= 9 ? 2 : n <= 19 ? 3 : n <= 29 ? 4 : 5;
  const unique = new Set(words).size;
  // A long but highly repetitive response is not more fluent.
  if (n >= 10 && unique / n < 0.45 && score > 2) score -= 1;
  return clamp(score);
}

/** VOCABULARY — number of unique words (punctuation not counted). */
export function scoreVocabulary(text: string): number {
  const unique = new Set(tokenize(text)).size;
  return clamp(unique <= 3 ? 1 : unique <= 7 ? 2 : unique <= 14 ? 3 : unique <= 21 ? 4 : 5);
}

/** GRAMMAR — transparent completeness indicators, not real grammar analysis. */
export function scoreGrammar(text: string): number {
  const words = tokenize(text);
  if (words.length === 0) return 1;
  let points = 0;
  const hasSubject = words.some((w) => SUBJECT_WORDS.includes(w));
  const hasVerb = words.some(
    (w) => VERB_WORDS.includes(w) || w.endsWith("ing") || w.endsWith("ed"),
  );
  const hasEndPunctuation = /[.!?]\s*$/.test(text.trim());
  const hasAuxPattern =
    /\b(am|is|are|was|were|do|does|did|will|would|can|could|should|have|has)\b/i.test(text);
  const sentences = text.split(/[.!?]+/).filter((s) => tokenize(s).length > 1).length;
  const startsCapital = /^[A-Z]/.test(text.trim());

  if (hasSubject) points += 1;
  if (hasVerb) points += 1;
  if (hasEndPunctuation) points += 1;
  if (hasAuxPattern) points += 1;
  if (sentences >= 2) points += 1;
  if (startsCapital) points += 1;

  // Obvious structural issues reduce the indicator.
  if (/\bi (is|are|am not not)\b/i.test(text)) points -= 1;
  if (/\b(a|an) (is|are)\b/i.test(text)) points -= 1;

  return clamp(Math.round((points / 6) * 4) + 1);
}

/** INTERACTION — connective / interaction expressions. */
export function scoreInteraction(text: string): number {
  const lower = ` ${text.toLowerCase()} `;
  let found = 0;
  for (const marker of INTERACTION_MARKERS) {
    if (marker.includes(" ")) {
      if (lower.includes(marker)) found += 1;
    } else if (new RegExp(`\\b${marker}\\b`).test(lower)) {
      found += 1;
    }
  }
  if (/\?/.test(text)) found += 1;
  return clamp(found === 0 ? 1 : found === 1 ? 2 : found === 2 ? 3 : found === 3 ? 4 : 5);
}

/** APPROPRIATENESS — simple keyword/category matching plus length vs task. */
export function scoreAppropriateness(text: string, keywords: string[]): number {
  const words = new Set(tokenize(text));
  if (words.size === 0) return 1;
  const matched = keywords.filter((k) => words.has(k.toLowerCase())).length;
  let score = matched === 0 ? 1 : matched === 1 ? 2 : matched === 2 ? 3 : matched === 3 ? 4 : 5;
  const n = words.size;
  if (n < 5 && score > 2) score = 2; // very short response
  if (n >= 12 && score < 3) score += 1; // developed but off-keyword response
  return clamp(score);
}

export function scoreResponse(text: string, keywords: string[]): Scores {
  return {
    fluency: scoreFluency(text),
    vocabulary: scoreVocabulary(text),
    grammar: scoreGrammar(text),
    interaction: scoreInteraction(text),
    appropriateness: scoreAppropriateness(text, keywords),
  };
}

export function overallScore(s: Scores): number {
  const sum = s.fluency + s.vocabulary + s.grammar + s.interaction + s.appropriateness;
  return Math.round((sum / 5) * 10) / 10;
}

/** Section 13 — prototype practice levels (not CEFR). */
export function prototypeLevel(overall: number): { level: number; label: string } {
  if (overall <= 2.0) return { level: 1, label: "Level 1 – Basic" };
  if (overall <= 3.0) return { level: 2, label: "Level 2 – Developing" };
  if (overall <= 4.0) return { level: 3, label: "Level 3 – Independent" };
  return { level: 4, label: "Level 4 – Confident" };
}

/** Section 17 — personalized feedback from actual scores. */
export function buildFeedback(scores: Scores, responseTimeSeconds: number): string[] {
  const out: string[] = [];
  if (scores.fluency < 3)
    out.push("Bạn nên mở rộng câu trả lời thành 2–3 ý thay vì chỉ trả lời bằng một câu ngắn.");
  if (scores.vocabulary < 3) out.push("Bạn nên bổ sung thêm từ vựng liên quan đến chủ đề.");
  if (scores.grammar < 3)
    out.push("Bạn nên viết câu đầy đủ chủ ngữ – động từ và kết thúc câu bằng dấu câu.");
  if (scores.interaction < 3)
    out.push("Bạn nên sử dụng các từ nối như because, however, so, also...");
  if (scores.appropriateness < 3)
    out.push("Câu trả lời nên tập trung hơn vào nội dung mà câu hỏi yêu cầu.");
  if (responseTimeSeconds > 7)
    out.push("Hãy luyện phản xạ bằng cách trả lời trong thời gian ngắn hơn.");
  if (
    scores.fluency >= 4 &&
    scores.vocabulary >= 4 &&
    scores.grammar >= 4 &&
    scores.interaction >= 4 &&
    scores.appropriateness >= 4
  )
    out.push("Bạn đang duy trì kết quả tốt. E2AI đề xuất thử tình huống khó hơn.");
  if (out.length === 0)
    out.push("Kết quả phiên này ổn định. Hãy tiếp tục luyện tập để giữ nhịp phản xạ.");
  return out;
}

function clamp(n: number): number {
  return Math.max(1, Math.min(5, n));
}
