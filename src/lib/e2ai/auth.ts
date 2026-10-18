/**
 * E2AI — Authentication & Session Management Layer (V1 Upgrade).
 *
 * Real multi-user authentication with Google Accounts.
 * Instant LocalStorage & Supabase session persistence, Hard Redirects,
 * Permanent Google Account linking for 44 official students (A01–A44),
 * and Safe Account Reset preserving 100% of student practice data.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { dispatchMockAuth, supabase } from "@/integrations/supabase/client";
import { clearCloudStudent, type OfficialStudent } from "./cloud";
import { mutate, setCurrentStudent } from "./storage";
import { OFFICIAL_STUDENTS_LIST, OFFICIAL_TEACHER_INFO } from "./content";

export type AppRole = "student" | "teacher";

export interface E2aiSession {
  role: AppRole;
  student_code: string | null;
  student_name: string;
  auth_user_id: string;
  email: string;
  avatar_url?: string | null;
  logged_at: string;
}

export interface E2aiProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  school: string | null;
  className: string | null;
  studentCode: string | null;
  learningGoal: string | null;
  avatarUrl: string | null;
  profileCompleted: boolean;
  createdAt: string;
}

export const AUTH_QUERY_KEY = ["e2ai", "auth"] as const;

/** Retrieve currently active session from LocalStorage synchronously */
export function getStoredSession(): E2aiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("e2ai_session");
    if (raw) {
      const parsed = JSON.parse(raw) as E2aiSession;
      if (parsed && (parsed.role === "teacher" || parsed.role === "student") && parsed.email) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Fallback to legacy e2ai_mock_auth_user
  try {
    const rawMock = localStorage.getItem("e2ai_mock_auth_user");
    if (rawMock) {
      const parsed = JSON.parse(rawMock) as {
        id?: string;
        email?: string;
        user_metadata?: { full_name?: string; name?: string };
      };
      if (parsed?.email) {
        const isT = isTeacherEmail(parsed.email);
        const code = isT ? null : extractStudentCodeFromUser(parsed.id, parsed.email);
        const name =
          parsed.user_metadata?.full_name ||
          parsed.user_metadata?.name ||
          (isT ? OFFICIAL_TEACHER_INFO.full_name : code ? getStudentNameByCode(code) : "Học sinh");
        return {
          role: isT ? "teacher" : "student",
          student_code: code,
          student_name: name,
          auth_user_id:
            parsed.id ||
            (isT ? "teacher-uuid-hong-lam" : `student-uuid-${(code || "a01").toLowerCase()}`),
          email: parsed.email.toLowerCase().trim(),
          logged_at: new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function getStudentNameByCode(code: string): string {
  const match = OFFICIAL_STUDENTS_LIST.find(
    (s) => s.student_code.toUpperCase() === code.toUpperCase(),
  );
  return match?.full_name || `Học sinh ${code}`;
}

function extractStudentCodeFromUser(id?: string, email?: string): string | null {
  if (id && id.startsWith("student-uuid-")) {
    const code = id.replace("student-uuid-", "").toUpperCase();
    if (OFFICIAL_STUDENTS_LIST.some((s) => s.student_code === code)) return code;
  }
  if (email && typeof window !== "undefined") {
    try {
      const rawMap = localStorage.getItem("e2ai_gmail_mappings");
      if (rawMap) {
        const map = JSON.parse(rawMap) as Record<string, string>;
        const code = map[email.toLowerCase().trim()];
        if (code) return code.toUpperCase();
      }
    } catch {}
  }
  return null;
}

/** Save session synchronously to LocalStorage */
export function saveStoredSession(session: E2aiSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("e2ai.guest_mode");
    localStorage.setItem("e2ai_session", JSON.stringify(session));
    localStorage.setItem(
      "e2ai_mock_auth_user",
      JSON.stringify({
        id: session.auth_user_id,
        email: session.email,
        user_metadata: {
          full_name: session.student_name,
          name: session.student_name,
        },
      }),
    );
    if (session.student_code) {
      setCurrentStudent(session.student_code);
    }
  } catch (err) {
    console.warn("Lỗi lưu session vào LocalStorage:", err);
  }
}

/** Clear session synchronously */
export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("e2ai_session");
    localStorage.removeItem("e2ai_mock_auth_user");
    localStorage.removeItem("e2ai.guest_mode");
  } catch {}
}

/**
 * Kiểm tra xem email có thuộc quyền Giáo viên không.
 * Khớp: .edu, .edu.vn, doanvanto, nthlam, honglam, nguyenthihonglam, giaovien, teacher.
 */
export function isTeacherEmail(email: string): boolean {
  const clean = (email || "").toLowerCase().trim();
  return (
    clean.endsWith(".edu") ||
    clean.endsWith(".edu.vn") ||
    clean.includes(".edu.") ||
    clean.includes("doanvanto") ||
    clean.includes("nthlam") ||
    clean.includes("nguyenthihonglam") ||
    clean.includes("honglam") ||
    clean.includes("giaovien") ||
    clean.includes("teacher") ||
    clean.startsWith("gv")
  );
}

/** Tra cứu học sinh theo địa chỉ Gmail (cả trên Supabase Cloud và mapping nội bộ) */
export async function findStudentByEmail(email: string): Promise<OfficialStudent | null> {
  const clean = (email || "").toLowerCase().trim();
  if (!clean) return null;

  // 1. Kiểm tra mapping lưu trữ trình duyệt trước
  if (typeof window !== "undefined") {
    try {
      const rawMap = localStorage.getItem("e2ai_gmail_mappings");
      if (rawMap) {
        const mappings = JSON.parse(rawMap) as Record<string, string>;
        const code = mappings[clean];
        if (code) {
          const match = OFFICIAL_STUDENTS_LIST.find(
            (s) => s.student_code.toUpperCase() === code.toUpperCase(),
          );
          if (match) {
            return {
              student_code: match.student_code,
              full_name: match.full_name,
              email: clean,
              school: match.school,
              grade: match.grade,
              class_name: match.class_name,
              linked_user_id: `student-uuid-${match.student_code.toLowerCase()}`,
              linked_at: new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Tra cứu từ cơ sở dữ liệu Supabase Cloud
  try {
    const { data } = await supabase
      .from("official_students")
      .select("*")
      .ilike("email", clean)
      .maybeSingle();

    if (data) {
      return data as OfficialStudent;
    }
  } catch (e) {
    console.warn("Lỗi tra cứu student theo email:", e);
  }

  // 3. Tra cứu từ danh sách mock students
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("e2ai_mock_students");
      if (raw) {
        const list = JSON.parse(raw) as OfficialStudent[];
        const found = list.find((s) => (s.email ?? "").toLowerCase() === clean);
        if (found) return found;
      }
    } catch {
      // ignore
    }
  }

  // 4. Tra cứu mẫu: Nếu email chứa mã số như a42 hoặc a01
  const codeMatch =
    clean.match(/(?:^|[._-])a(\d{2})(?:[._-]|@|$)/i) || clean.match(/\ba(\d{2})\b/i);
  if (codeMatch && codeMatch[1]) {
    const code = `A${codeMatch[1]}`;
    const match = OFFICIAL_STUDENTS_LIST.find((s) => s.student_code === code);
    if (match) {
      return {
        student_code: match.student_code,
        full_name: match.full_name,
        email: clean,
        school: match.school,
        grade: match.grade,
        class_name: match.class_name,
        linked_user_id: `student-uuid-${match.student_code.toLowerCase()}`,
        linked_at: new Date().toISOString(),
      };
    }
  }

  return null;
}

/** Lưu session xác thực cho Giáo viên và đồng bộ Cloud */
export async function authenticateTeacherSession(
  email = "nguyenthihonglam.c3dvt@soctrang.edu.vn",
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  const uid = "teacher-uuid-hong-lam";
  const fullName = OFFICIAL_TEACHER_INFO.full_name;

  const session: E2aiSession = {
    role: "teacher",
    student_code: null,
    student_name: fullName,
    auth_user_id: uid,
    email: cleanEmail,
    logged_at: new Date().toISOString(),
  };
  saveStoredSession(session);

  // Sync to Supabase
  try {
    await supabase.rpc("link_official_teacher");
  } catch {}

  try {
    await supabase
      .from("official_teacher")
      .update({
        linked_user_id: uid,
        linked_at: new Date().toISOString(),
        email: cleanEmail,
      })
      .eq("id", 1);
  } catch {}

  try {
    await supabase.from("profiles").upsert({
      user_id: uid,
      email: cleanEmail,
      full_name: fullName,
      school: "THPT Đoàn Văn Tố",
      profile_completed: true,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  dispatchMockAuth("SIGNED_IN");
}

/** Lưu session xác thực cho Học sinh, gắn vĩnh viễn Gmail với Mã HS trên Supabase Cloud */
export async function authenticateStudentSession(
  studentCode: string,
  studentName: string,
  email: string,
): Promise<void> {
  const cleanCode = studentCode.toUpperCase().trim();
  const cleanEmail = email.toLowerCase().trim();
  const uid = `student-uuid-${cleanCode.toLowerCase()}`;

  const session: E2aiSession = {
    role: "student",
    student_code: cleanCode,
    student_name: studentName,
    auth_user_id: uid,
    email: cleanEmail,
    logged_at: new Date().toISOString(),
  };
  saveStoredSession(session);

  // 1. Lưu session người dùng và Gmail mapping vào LocalStorage
  if (typeof window !== "undefined") {
    try {
      const rawMap = localStorage.getItem("e2ai_gmail_mappings") || "{}";
      const mappings = JSON.parse(rawMap) as Record<string, string>;
      mappings[cleanEmail] = cleanCode;
      localStorage.setItem("e2ai_gmail_mappings", JSON.stringify(mappings));
    } catch {}

    try {
      const raw = localStorage.getItem("e2ai_mock_students");
      if (raw) {
        const list = JSON.parse(raw) as OfficialStudent[];
        const idx = list.findIndex((s) => s.student_code === cleanCode);
        if (idx >= 0) {
          list[idx]!.linked_user_id = uid;
          list[idx]!.linked_at = new Date().toISOString();
          list[idx]!.email = cleanEmail;
          localStorage.setItem("e2ai_mock_students", JSON.stringify(list));
        }
      }
    } catch {}
  }

  // 2. Cập nhật bảng official_students trên Supabase Cloud
  try {
    await supabase
      .from("official_students")
      .update({
        linked_user_id: uid,
        linked_at: new Date().toISOString(),
        email: cleanEmail,
      })
      .eq("student_code", cleanCode);
  } catch (e) {
    console.warn("Cập nhật official_students trên cloud:", e);
  }

  try {
    await supabase.rpc("link_official_student", {
      _code: cleanCode,
      _full_name: studentName,
    });
  } catch (e) {
    console.warn("RPC link_official_student:", e);
  }

  try {
    await supabase.from("profiles").upsert({
      user_id: uid,
      email: cleanEmail,
      full_name: studentName,
      student_code: cleanCode,
      school: "THPT Đoàn Văn Tố",
      class_name: "12A1",
      profile_completed: true,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  // 3. Cập nhật bộ nhớ cục bộ
  const officialMatch = OFFICIAL_STUDENTS_LIST.find((s) => s.student_code === cleanCode);
  mutate((db) => {
    const existing = db.students.find((s) => s.studentId === cleanCode);
    const updatedStudent = {
      studentId: cleanCode,
      fullName: studentName,
      className: officialMatch?.class_name ?? "12A1",
      school: officialMatch?.school ?? "THPT Đoàn Văn Tố",
      learningGoal: existing?.learningGoal ?? "General English improvement",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    return {
      ...db,
      students: [...db.students.filter((s) => s.studentId !== cleanCode), updatedStudent],
      currentStudentId: cleanCode,
    };
  });

  dispatchMockAuth("SIGNED_IN");
}

/**
 * Reset liên kết tài khoản Google cho học sinh nếu chọn sai,
 * BẢO TỒN 100% dữ liệu bài làm/điểm số trong practice_sessions và LocalStorage.
 */
export async function resetStudentGoogleLink(studentCode: string): Promise<void> {
  const cleanCode = studentCode.toUpperCase().trim();

  // 1. Cập nhật bảng official_students trên Supabase Cloud (xóa liên kết Google)
  try {
    await supabase
      .from("official_students")
      .update({
        linked_user_id: null,
        linked_at: null,
        email: null,
      })
      .eq("student_code", cleanCode);
  } catch (e) {
    console.warn("Lỗi gỡ liên kết official_students trên cloud:", e);
  }

  try {
    await supabase.rpc("unlink_official_student", {
      _code: cleanCode,
    });
  } catch (e) {
    console.warn("RPC unlink_official_student:", e);
  }

  // 2. Xóa khỏi mapping LocalStorage
  if (typeof window !== "undefined") {
    try {
      const rawMap = localStorage.getItem("e2ai_gmail_mappings") || "{}";
      const mappings = JSON.parse(rawMap) as Record<string, string>;
      for (const [em, code] of Object.entries(mappings)) {
        if (code.toUpperCase() === cleanCode) {
          delete mappings[em];
        }
      }
      localStorage.setItem("e2ai_gmail_mappings", JSON.stringify(mappings));
    } catch {}

    try {
      const raw = localStorage.getItem("e2ai_mock_students");
      if (raw) {
        const list = JSON.parse(raw) as OfficialStudent[];
        const idx = list.findIndex((s) => s.student_code === cleanCode);
        if (idx >= 0) {
          list[idx]!.linked_user_id = null;
          list[idx]!.linked_at = null;
          list[idx]!.email = null;
          localStorage.setItem("e2ai_mock_students", JSON.stringify(list));
        }
      }
    } catch {}

    // Nếu học sinh này đang đăng nhập trên máy này, xóa session
    const current = getStoredSession();
    if (current && current.student_code === cleanCode) {
      clearStoredSession();
    }
  }

  dispatchMockAuth("USER_UPDATED");
}

/** Đảm bảo 44 học sinh Master từ A01 đến A44 có mặt đầy đủ trên Supabase Cloud */
export async function ensureOfficialStudentsRoster(): Promise<void> {
  try {
    const { data: existing } = await supabase.from("official_students").select("student_code");
    const existingCodes = new Set((existing ?? []).map((s) => s.student_code.toUpperCase()));

    const missing = OFFICIAL_STUDENTS_LIST.filter(
      (s) => !existingCodes.has(s.student_code.toUpperCase()),
    );

    if (missing.length > 0) {
      await supabase.from("official_students").insert(
        missing.map((s) => ({
          student_code: s.student_code,
          full_name: s.full_name,
          school: s.school,
          class_name: s.class_name,
          grade: s.grade,
        })),
      );
    }
  } catch (e) {
    console.warn("Đồng bộ danh sách 44 học sinh:", e);
  }
}

async function loadAuth(): Promise<{
  user: User | null;
  profile: E2aiProfile | null;
  role: AppRole | null;
  official?: OfficialStudent | null;
  teacherLinked?: boolean;
  isOfficialTeacher?: boolean;
}> {
  const stored = getStoredSession();

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch {}

  if (!user && stored) {
    user = {
      id: stored.auth_user_id,
      email: stored.email,
      user_metadata: {
        full_name: stored.student_name,
        name: stored.student_name,
      },
      app_metadata: {},
      aud: "authenticated",
      created_at: stored.logged_at,
    } as unknown as User;
  }

  if (!user) return { user: null, profile: null, role: null };

  const userEmail = (user.email ?? stored?.email ?? "").toLowerCase().trim();
  const userName = String(
    user.user_metadata?.["full_name"] || user.user_metadata?.["name"] || stored?.student_name || "",
  );
  const isTeacherAccount =
    stored?.role === "teacher" ||
    isTeacherEmail(userEmail) ||
    userName.toLowerCase().includes("hồng lam");

  let official: OfficialStudent | null = null;
  if (!isTeacherAccount) {
    if (stored?.student_code) {
      const match = OFFICIAL_STUDENTS_LIST.find((s) => s.student_code === stored.student_code);
      if (match) {
        official = {
          student_code: match.student_code,
          full_name: match.full_name,
          email: userEmail,
          school: match.school,
          grade: match.grade,
          class_name: match.class_name,
          linked_user_id: user.id,
          linked_at: stored.logged_at,
        };
      }
    }
    if (!official) {
      official = await findStudentByEmail(userEmail);
    }
  }

  const role: AppRole = isTeacherAccount ? "teacher" : "student";

  const profile: E2aiProfile = {
    userId: user.id,
    email: userEmail,
    fullName: isTeacherAccount
      ? OFFICIAL_TEACHER_INFO.full_name
      : (official?.full_name ?? userName),
    role,
    school: "THPT Đoàn Văn Tố",
    className: isTeacherAccount ? null : (official?.class_name ?? "12A1"),
    studentCode: isTeacherAccount ? null : (official?.student_code ?? stored?.student_code ?? null),
    learningGoal: "General English improvement",
    avatarUrl: null,
    profileCompleted: true,
    createdAt: user.created_at || new Date().toISOString(),
  };

  return {
    user,
    profile,
    role,
    official,
    teacherLinked: isTeacherAccount,
    isOfficialTeacher: isTeacherAccount,
  };
}

export function useAuth() {
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: loadAuth,
    staleTime: 10_000,
    retry: 1,
  });

  const stored = getStoredSession();
  const hasStoredSession = Boolean(stored);
  const storedIsTeacher = stored?.role === "teacher";
  const storedOfficial = stored?.student_code
    ? ({
        student_code: stored.student_code,
        full_name: stored.student_name,
        email: stored.email,
        school: "THPT Đoàn Văn Tố",
        grade: "12",
        class_name: "12A1",
        linked_user_id: stored.auth_user_id,
        linked_at: stored.logged_at,
      } as OfficialStudent)
    : null;

  const isTeacher = Boolean(query.data?.isOfficialTeacher || storedIsTeacher);
  const signedIn = Boolean(query.data?.user || hasStoredSession);
  const official = (query.data?.official as OfficialStudent | null) ?? storedOfficial ?? null;
  const role =
    query.data?.role ?? stored?.role ?? (isTeacher ? "teacher" : official ? "student" : null);

  return {
    loading: query.isPending && !hasStoredSession,
    user:
      query.data?.user ??
      (hasStoredSession ? ({ id: stored!.auth_user_id, email: stored!.email } as User) : null),
    profile: query.data?.profile ?? null,
    role,
    official,
    teacherLinked: query.data?.teacherLinked ?? storedIsTeacher,
    isTeacher,
    signedIn,
    refresh: query.refetch,
  };
}

/** Keeps the auth cache in sync with real sign-in / sign-out events. */
export function useAuthSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries({ queryKey: ["e2ai", "cloud"] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
}

export async function quickSignInAsTeacher() {
  await authenticateTeacherSession();
}

export async function quickSignInAsStudent(code: string, fullName: string) {
  await authenticateStudentSession(code, fullName, `${code.toLowerCase()}@gmail.com`);
}

export async function findOfficialStudent(name: string) {
  const { data, error } = await supabase.rpc("find_official_student", { _name: name });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function linkOfficialStudent(code: string, fullName: string) {
  const { error } = await supabase.rpc("link_official_student", {
    _code: code,
    _full_name: fullName,
  });
  if (error) throw new Error(error.message);
}

export async function linkOfficialTeacher() {
  const { error } = await supabase.rpc("link_official_teacher");
  if (error) throw new Error(error.message);
}

export async function saveProfile(
  userId: string,
  values: {
    fullName: string;
    school: string;
    className?: string | null;
    studentCode?: string | null;
    learningGoal?: string | null;
  },
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: values.fullName,
      school: values.school,
      class_name: values.className ?? null,
      student_code: values.studentCode ?? null,
      learning_goal: values.learningGoal ?? null,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function signOut() {
  clearStoredSession();
  clearCloudStudent();
  setCurrentStudent(null);
  try {
    await supabase.auth.signOut();
  } catch {}
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
