/** E2AI V1 — export helpers (CSV / JSON), student-scoped only. */

import type { DevLogEntry, Session, Student, TestEntry } from "./types";

function download(filename: string, mime: string, content: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([`\uFEFF${content}`], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join(
    "\r\n",
  );
}

export const SESSION_CSV_HEADERS = [
  "Student ID",
  "Date",
  "Category",
  "Scenario",
  "Difficulty",
  "Response Time (s)",
  "Word Count",
  "Fluency",
  "Vocabulary",
  "Grammar",
  "Interaction",
  "Appropriateness",
  "Overall Score",
];

export function sessionRows(sessions: Session[]): unknown[][] {
  return sessions.map((s) => [
    s.studentId,
    new Date(s.createdAt).toLocaleString("vi-VN"),
    s.categoryLabel,
    s.scenario,
    s.difficulty,
    s.responseTimeSeconds.toFixed(1),
    s.wordCount,
    s.scores.fluency,
    s.scores.vocabulary,
    s.scores.grammar,
    s.scores.interaction,
    s.scores.appropriateness,
    s.overall.toFixed(1),
  ]);
}

export function exportSessionsCsv(student: Student, sessions: Session[]) {
  if (sessions.length === 0) throw new Error("Chưa có dữ liệu phiên luyện tập để xuất.");
  download(
    `e2ai-${student.studentId}-sessions.csv`,
    "text/csv",
    toCsv(SESSION_CSV_HEADERS, sessionRows(sessions)),
  );
}

export function exportSessionsJson(student: Student, sessions: Session[]) {
  if (sessions.length === 0) throw new Error("Chưa có dữ liệu phiên luyện tập để xuất.");
  const payload = {
    product: "E2AI V1",
    note: "E2AI V1 scores are prototype indicators for this student research project and are not official language proficiency scores.",
    exportedAt: new Date().toISOString(),
    student,
    sessionCount: sessions.length,
    sessions,
  };
  download(
    `e2ai-${student.studentId}-data.json`,
    "application/json",
    JSON.stringify(payload, null, 2),
  );
}

export function exportDevLogCsv(entries: DevLogEntry[]) {
  if (entries.length === 0) throw new Error("Nhật ký phát triển đang trống.");
  download(
    "e2ai-development-log.csv",
    "text/csv",
    toCsv(
      [
        "Date",
        "Version",
        "Problem identified",
        "Change made",
        "Reason for change",
        "Testing result",
        "Next action",
      ],
      entries.map((e) => [
        e.date,
        e.version,
        e.problem,
        e.change,
        e.reason,
        e.testing,
        e.nextAction,
      ]),
    ),
  );
}

export function exportTestsCsv(entries: TestEntry[]) {
  if (entries.length === 0) throw new Error("Chưa có bản ghi kiểm thử nào.");
  download(
    "e2ai-prototype-testing.csv",
    "text/csv",
    toCsv(
      [
        "Test ID",
        "Feature tested",
        "Input",
        "Expected result",
        "Actual result",
        "Pass/Fail",
        "Problem",
        "Modification",
      ],
      entries.map((e) => [
        e.testId,
        e.feature,
        e.input,
        e.expected,
        e.actual,
        e.status === "pass" ? "Pass" : e.status === "fail" ? "Fail" : "Pending",
        e.problem,
        e.modification,
      ]),
    ),
  );
}

export function exportReportHtml(studentId: string, html: string) {
  download(`e2ai-${studentId}-report.html`, "text/html", html);
}
