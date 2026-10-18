/**
 * E2AI V1 — local storage layer.
 *
 * V1 keeps every student's data in the browser only: no account, no password,
 * no server copy. Each record is keyed by Student ID, so data stays logically
 * separated per student and one student cannot read another student's data from
 * a different device.
 *
 * V2 EXTENSION POINT: replace the read/write helpers below with database calls
 * (tables: students, practice_sessions, practice_tasks, scores, recommendations)
 * plus per-student row-level security. The rest of the app only uses the
 * exported functions, so no page needs to change.
 */

import { useEffect, useState } from "react";
import type { DevLogEntry, E2aiDb, Session, Student, TestEntry } from "./types";

const KEY = "e2ai.v1.db";
const EVENT = "e2ai-db-change";

export const EMPTY_DB: E2aiDb = {
  students: [],
  sessions: [],
  currentStudentId: null,
  devLog: [],
  tests: [],
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadDb(): E2aiDb {
  if (!isBrowser()) return EMPTY_DB;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_DB;
    const parsed = JSON.parse(raw) as Partial<E2aiDb>;
    return {
      students: parsed.students ?? [],
      sessions: parsed.sessions ?? [],
      currentStudentId: parsed.currentStudentId ?? null,
      devLog: parsed.devLog ?? [],
      tests: parsed.tests ?? [],
    };
  } catch {
    // Corrupted storage should never break the app.
    return EMPTY_DB;
  }
}

export function saveDb(db: E2aiDb) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("Không thể lưu dữ liệu trên thiết bị này.");
  }
  window.dispatchEvent(new Event(EVENT));
}

export function mutate(fn: (db: E2aiDb) => E2aiDb) {
  saveDb(fn(loadDb()));
}

/** React hook: current database snapshot, kept in sync across the app. */
export function useE2aiDb(): { db: E2aiDb; hydrated: boolean } {
  const [db, setDb] = useState<E2aiDb>(EMPTY_DB);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setDb(loadDb());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { db, hydrated };
}

export function useCurrentStudent() {
  const { db, hydrated } = useE2aiDb();
  const student = db.students.find((s) => s.studentId === db.currentStudentId) ?? null;
  const sessions = student
    ? db.sessions
        .filter((s) => s.studentId === student.studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  return { db, hydrated, student, sessions };
}

/* ---------------- mutations ---------------- */

export function upsertStudent(student: Student) {
  mutate((db) => {
    const others = db.students.filter((s) => s.studentId !== student.studentId);
    return { ...db, students: [...others, student], currentStudentId: student.studentId };
  });
}

export function setCurrentStudent(studentId: string | null) {
  mutate((db) => ({ ...db, currentStudentId: studentId }));
}

export function addSession(session: Session) {
  mutate((db) => ({ ...db, sessions: [...db.sessions, session] }));
  // Signed-in students: also save to the central database (source of truth).
  void import("./cloud").then(async ({ pushSession }) => {
    const cloudId = await pushSession(session);
    if (cloudId) {
      mutate((db) => ({
        ...db,
        sessions: db.sessions.map((s) => (s.id === session.id ? { ...s, id: cloudId } : s)),
      }));
    }
  });
}

export function deleteStudentData(studentId: string) {
  void import("./cloud").then(({ deleteCloudSessions }) => deleteCloudSessions());
  mutate((db) => ({
    ...db,
    students: db.students.filter((s) => s.studentId !== studentId),
    sessions: db.sessions.filter((s) => s.studentId !== studentId),
    currentStudentId: db.currentStudentId === studentId ? null : db.currentStudentId,
  }));
}

export function clearSessions(studentId: string) {
  void import("./cloud").then(({ deleteCloudSessions }) => deleteCloudSessions());
  mutate((db) => ({ ...db, sessions: db.sessions.filter((s) => s.studentId !== studentId) }));
}

export function addDevLog(entry: DevLogEntry) {
  mutate((db) => ({ ...db, devLog: [entry, ...db.devLog] }));
}

export function removeDevLog(id: string) {
  mutate((db) => ({ ...db, devLog: db.devLog.filter((e) => e.id !== id) }));
}

export function upsertTest(entry: TestEntry) {
  mutate((db) => {
    const others = db.tests.filter((t) => t.id !== entry.id);
    return { ...db, tests: [...others, entry] };
  });
}

export function removeTest(id: string) {
  mutate((db) => ({ ...db, tests: db.tests.filter((t) => t.id !== id) }));
}

export function newId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
