/**
 * E2AI V1 — data model.
 *
 * Data categories are kept explicit for research integrity:
 *  - `measured`   : automatically measured (response time, word count, timestamps)
 *  - `ruleScore`  : rule-based prototype scores (NOT validated assessment)
 *  - `entered`    : student-entered information (profile, response text)
 *  - V2 (future)  : AI-generated analysis would be stored in `aiAnalysis` (unused in V1)
 */

export type LearningGoal =
  | "Improve speaking fluency"
  | "Improve response speed"
  | "Improve vocabulary"
  | "Improve grammar"
  | "Improve interaction"
  | "General English improvement";

export interface Student {
  /** Student-entered */
  studentId: string;
  fullName: string;
  className: string;
  school: string;
  learningGoal: LearningGoal;
  createdAt: string;
  isDemo?: boolean;
}

export interface Scores {
  fluency: number;
  vocabulary: number;
  grammar: number;
  interaction: number;
  appropriateness: number;
}

export type SkillKey = keyof Scores;

export interface Recommendation {
  /** e.g. "Rapid Response Practice" */
  title: string;
  /** Vietnamese explanation of WHY (transparent adaptation) */
  reason: string;
  /** Suggested difficulty for the next task (1-4) */
  nextDifficulty: number;
  difficultyNote: string;
}

export interface Session {
  id: string;
  studentId: string;
  kind: "diagnostic" | "practice" | "posttest";
  categoryId: string;
  categoryLabel: string;
  scenario: string;
  question: string;
  difficulty: number;
  suggestedSeconds: number;
  /** Student-entered */
  response: string;
  /** Audio recording (Data URL base64 or audio blob URL) */
  audioUrl?: string;
  /** Automatically measured */
  responseTimeSeconds: number;
  wordCount: number;
  createdAt: string;
  /** Rule-based prototype scores */
  scores: Scores;
  overall: number;
  feedback: string[];
  recommendation: Recommendation;
  isDemo?: boolean;
  /** Reserved for V2 AI analysis — always undefined in V1 */
  aiAnalysis?: never;
}

export interface DevLogEntry {
  id: string;
  date: string;
  version: string;
  problem: string;
  change: string;
  reason: string;
  testing: string;
  nextAction: string;
}

export interface TestEntry {
  id: string;
  testId: string;
  feature: string;
  input: string;
  expected: string;
  actual: string;
  status: "pass" | "fail" | "pending";
  problem: string;
  modification: string;
}

export interface E2aiDb {
  students: Student[];
  sessions: Session[];
  currentStudentId: string | null;
  devLog: DevLogEntry[];
  tests: TestEntry[];
}
