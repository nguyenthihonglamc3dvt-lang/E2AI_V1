/**
 * E2AI V1 — DEMO MODE (section 27).
 * Demo records are always flagged `isDemo: true` and use the reserved Student ID
 * below, so they are never mixed with real student data.
 */

import { PRACTICE_CATEGORIES } from "./content";
import { buildRecommendation } from "./adaptive";
import { buildFeedback, countWords, overallScore, scoreResponse } from "./scoring";
import { loadDb, mutate, newId } from "./storage";
import type { Session, Student } from "./types";

export const DEMO_STUDENT_ID = "E2AI-DEMO";

export const DEMO_STUDENT: Student = {
  studentId: DEMO_STUDENT_ID,
  fullName: "DEMO DATA – NOT REAL STUDENT DATA",
  className: "12A-DEMO",
  school: "THPT Demo",
  learningGoal: "General English improvement",
  createdAt: new Date().toISOString(),
  isDemo: true,
};

const DEMO_RESPONSES = [
  "I would tell my friend not to worry. We can ask the teacher for more time.",
  "After school I usually go home and study English, but sometimes I play football with my friends because it helps me relax.",
  "I think students should use less plastic. For example, we could bring our own bottle to school, and also put rubbish in the right bin.",
  "Maybe we should go to the beach because it is cheap and everyone likes swimming. However, we need to ask our parents first.",
  "My goal this year is to speak English every day. I will practise ten minutes in the morning, and I also want to join the English club, because speaking with other students helps me a lot.",
  "I am sorry the project is late. Our group had exams last week, so we could not finish it, but we will send it tomorrow morning.",
];

export function isDemoActive(): boolean {
  return loadDb().students.some((s) => s.studentId === DEMO_STUDENT_ID);
}

export function seedDemoData() {
  const tasks = PRACTICE_CATEGORIES.flatMap((c) => c.tasks.map((t) => ({ c, t })));
  const sessions: Session[] = [];
  const now = Date.now();

  DEMO_RESPONSES.forEach((response, i) => {
    const pick = tasks[(i * 3) % tasks.length]!;
    const scores = scoreResponse(response, pick.t.keywords);
    const overall = overallScore(scores);
    const responseTimeSeconds = Math.round((9.2 - i * 0.45) * 10) / 10;
    const createdAt = new Date(now - (DEMO_RESPONSES.length - i) * 86_400_000).toISOString();
    sessions.push({
      id: newId("demo"),
      studentId: DEMO_STUDENT_ID,
      kind: i === 0 ? "diagnostic" : "practice",
      categoryId: pick.c.id,
      categoryLabel: pick.c.label,
      scenario: pick.t.scenario,
      question: pick.t.question,
      difficulty: pick.t.difficulty,
      suggestedSeconds: pick.t.suggestedSeconds,
      response,
      responseTimeSeconds,
      wordCount: countWords(response),
      createdAt,
      scores,
      overall,
      feedback: buildFeedback(scores, responseTimeSeconds),
      recommendation: buildRecommendation({
        latestScores: scores,
        latestOverall: overall,
        latestResponseTime: responseTimeSeconds,
        avgResponseTime: responseTimeSeconds,
        lastThreeOverall: [overall],
        currentDifficulty: pick.t.difficulty,
      }),
      isDemo: true,
    });
  });

  mutate((db) => ({
    ...db,
    students: [...db.students.filter((s) => s.studentId !== DEMO_STUDENT_ID), DEMO_STUDENT],
    sessions: [...db.sessions.filter((s) => s.studentId !== DEMO_STUDENT_ID), ...sessions],
    currentStudentId: DEMO_STUDENT_ID,
  }));
}

export function clearDemoData() {
  mutate((db) => ({
    ...db,
    students: db.students.filter((s) => !s.isDemo),
    sessions: db.sessions.filter((s) => !s.isDemo),
    currentStudentId: db.currentStudentId === DEMO_STUDENT_ID ? null : db.currentStudentId,
  }));
}
