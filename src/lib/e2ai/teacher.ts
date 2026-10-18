/**
 * Teacher Admin data layer — reads the whole A01–A44 roster and every practice
 * session from the online database and local mirror.
 * Preserves 100% of student practice data even across account link resets.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { OfficialStudent } from "./cloud";
import { useAuth } from "./auth";
import { OFFICIAL_STUDENTS_LIST } from "./content";
import { loadDb } from "./storage";

export type SessionRow = Tables<"practice_sessions">;
export type StudentStatus = "unlinked" | "not_started" | "in_progress" | "completed";

export const STATUS_LABEL: Record<StudentStatus, string> = {
  unlinked: "Chưa liên kết",
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
};

export interface RosterEntry {
  student: OfficialStudent;
  sessions: SessionRow[]; // newest first
  practice: SessionRow[];
  pre: SessionRow[];
  post: SessionRow[];
  status: StudentStatus;
  preAvgOverall: number | null;
  preAvgResponse: number | null;
  postAvgOverall: number | null;
  postAvgResponse: number | null;
  preSkills: Record<string, number | null>;
  postSkills: Record<string, number | null>;
}

export const isPre = (s: SessionRow) =>
  s.activity_type === "diagnostic" || s.activity_type === "pretest";
export const isPost = (s: SessionRow) => s.activity_type === "posttest";

export const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export function avg(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null && !Number.isNaN(x));
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

export const fmt = (v: number | null, suffix = "") =>
  v === null ? "Chưa có dữ liệu" : `${v}${suffix}`;

export const SKILLS = [
  ["fluency_score", "Lưu loát"],
  ["vocabulary_score", "Từ vựng"],
  ["grammar_score", "Ngữ pháp"],
  ["interaction_score", "Tương tác"],
  ["appropriateness_score", "Phù hợp"],
] as const;

export function useTeacherData() {
  const { isTeacher } = useAuth();
  return useQuery({
    queryKey: ["e2ai", "teacher", "all"],
    enabled: isTeacher,
    queryFn: async (): Promise<RosterEntry[]> => {
      const [st, se] = await Promise.all([
        supabase.from("official_students").select("*").order("student_code"),
        supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }),
      ]);

      // Danh sách sinh viên từ DB hoặc fallback vào 44 sinh viên Master
      const dbStudents = (st.data ?? []) as OfficialStudent[];
      const studentMap = new Map<string, OfficialStudent>();
      OFFICIAL_STUDENTS_LIST.forEach((os) => {
        studentMap.set(os.student_code.toUpperCase(), {
          student_code: os.student_code,
          full_name: os.full_name,
          email: null,
          school: os.school,
          grade: os.grade,
          class_name: os.class_name,
          linked_user_id: null,
          linked_at: null,
        });
      });
      dbStudents.forEach((s) => {
        studentMap.set(s.student_code.toUpperCase(), s);
      });

      const allOfficialStudents = Array.from(studentMap.values()).sort((a, b) =>
        a.student_code.localeCompare(b.student_code),
      );

      // Nhóm session theo nhiều khóa nhận diện (để bảo tồn 100% dữ liệu ngay cả khi reset liên kết tài khoản)
      const sessionsList = (se.data ?? []) as SessionRow[];

      // Bổ sung các phiên lưu trữ trong LocalStorage nếu DB online chưa kịp nhận
      const localSessions = loadDb().sessions;
      const seenSessionIds = new Set(sessionsList.map((s) => s.id));

      localSessions.forEach((ls) => {
        if (!seenSessionIds.has(ls.id) && !ls.isDemo) {
          sessionsList.push({
            id: ls.id,
            student_id: `student-uuid-${ls.studentId.toLowerCase()}`,
            activity_type: ls.kind,
            category_id: ls.categoryId,
            category_label: ls.categoryLabel,
            scenario: ls.scenario,
            question: ls.question,
            difficulty: ls.difficulty,
            suggested_seconds: ls.suggestedSeconds,
            response_text: ls.response,
            response_time_seconds: ls.responseTimeSeconds,
            duration_seconds: null,
            word_count: ls.wordCount,
            overall_score: ls.overall,
            fluency_score: ls.scores.fluency,
            vocabulary_score: ls.scores.vocabulary,
            grammar_score: ls.scores.grammar,
            interaction_score: ls.scores.interaction,
            appropriateness_score: ls.scores.appropriateness,
            feedback: ls.feedback as never,
            recommendation: ls.recommendation as never,
            status: "completed",
            audio_url: ls.audioUrl ?? null,
            started_at: ls.createdAt,
            completed_at: ls.createdAt,
            created_at: ls.createdAt,
            updated_at: ls.createdAt,
          });
        }
      });

      const byKey = new Map<string, SessionRow[]>();
      sessionsList.forEach((r) => {
        const sid = (r.student_id || "").toLowerCase();
        const existing = byKey.get(sid) ?? [];
        existing.push(r);
        byKey.set(sid, existing);
      });

      return allOfficialStudents.map((student) => {
        const code = student.student_code.toUpperCase();
        const codeLower = code.toLowerCase();
        const uuidKey = `student-uuid-${codeLower}`;
        const linkedId = student.linked_user_id ? student.linked_user_id.toLowerCase() : null;

        // Gom tất cả các phiên thuộc về học sinh này (bảo tồn 100% dữ liệu bài làm)
        const combined = new Map<string, SessionRow>();
        const addList = (items?: SessionRow[]) => {
          (items ?? []).forEach((row) => combined.set(row.id, row));
        };

        if (linkedId) addList(byKey.get(linkedId));
        addList(byKey.get(uuidKey));
        addList(byKey.get(codeLower));
        addList(byKey.get(code));

        const sessions = Array.from(combined.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );

        const pre = sessions.filter(isPre);
        const post = sessions.filter(isPost);
        const practice = sessions.filter((s) => !isPre(s) && !isPost(s));

        const status: StudentStatus = !student.linked_user_id
          ? "unlinked"
          : post.length
            ? "completed"
            : sessions.length
              ? "in_progress"
              : "not_started";

        const preAvgOverall = avg(pre.map((s) => num(s.overall_score)));
        const preAvgResponse = avg(pre.map((s) => num(s.response_time_seconds)));
        const postAvgOverall = avg(post.map((s) => num(s.overall_score)));
        const postAvgResponse = avg(post.map((s) => num(s.response_time_seconds)));

        const preSkills: Record<string, number | null> = {};
        const postSkills: Record<string, number | null> = {};

        SKILLS.forEach(([k]) => {
          preSkills[k] = avg(pre.map((s) => num(s[k])));
          postSkills[k] = avg(post.map((s) => num(s[k])));
        });

        return {
          student,
          sessions,
          practice,
          pre,
          post,
          status,
          preAvgOverall,
          preAvgResponse,
          postAvgOverall,
          postAvgResponse,
          preSkills,
          postSkills,
        };
      });
    },
  });
}

export const kindLabel = (s: SessionRow) =>
  isPre(s) ? "Pre-test (Kiểm tra đầu vào)" : isPost(s) ? "Post-test" : "Luyện tập";

function sessionRow(e: RosterEntry, s: SessionRow) {
  return {
    "Mã NC": e.student.student_code,
    "Họ tên": e.student.full_name,
    Loại: kindLabel(s),
    "Thời gian": new Date(s.created_at).toLocaleString("vi-VN"),
    Nhóm: s.category_label ?? "",
    "Câu hỏi": s.question ?? "",
    "Câu trả lời (transcript)": s.response_text ?? "",
    "Số từ": num(s.word_count),
    "Phản hồi sau (s)": num(s.response_time_seconds),
    "Thời lượng (s)": num(s.duration_seconds),
    "Độ khó": num(s.difficulty),
    "Lưu loát": num(s.fluency_score),
    "Từ vựng": num(s.vocabulary_score),
    "Ngữ pháp": num(s.grammar_score),
    "Tương tác": num(s.interaction_score),
    "Phù hợp": num(s.appropriateness_score),
    "Tổng thể": num(s.overall_score),
    "Nhận xét": Array.isArray(s.feedback) ? (s.feedback as string[]).join(" | ") : "",
  };
}

export function summary(data: RosterEntry[]) {
  const all = data.flatMap((e) => e.sessions);
  const allPre = data.flatMap((e) => e.pre);
  const allPost = data.flatMap((e) => e.post);
  const responseTimes = all.map((s) => num(s.response_time_seconds));
  const preResponseTimes = allPre.map((s) => num(s.response_time_seconds));
  const postResponseTimes = allPost.map((s) => num(s.response_time_seconds));

  const preOverall = avg(allPre.map((s) => num(s.overall_score)));
  const postOverall = avg(allPost.map((s) => num(s.overall_score)));
  const preResponse = avg(preResponseTimes);
  const postResponse = avg(postResponseTimes);

  const preVsPostSkills = SKILLS.map(([k, label]) => ({
    name: label,
    "Pre-test": avg(allPre.map((s) => num(s[k]))) ?? 0,
    "Post-test": avg(allPost.map((s) => num(s[k]))) ?? 0,
  }));

  return {
    total: data.length,
    linked: data.filter((e) => e.student.linked_user_id).length,
    practiced: data.filter((e) => e.practice.length > 0).length,
    notPracticed: data.filter((e) => e.practice.length === 0).length,
    sessions: all.length,
    practiceSessions: data.reduce((a, e) => a + e.practice.length, 0),
    preStudents: data.filter((e) => e.pre.length).length,
    postStudents: data.filter((e) => e.post.length).length,
    withTranscript: all.filter((s) => (s.response_text ?? "").trim()).length,
    avgOverall: avg(all.map((s) => num(s.overall_score))),
    avgResponse: avg(responseTimes),
    avgWords: avg(all.map((s) => num(s.word_count))),
    preAvgOverall: preOverall,
    postAvgOverall: postOverall,
    preAvgResponse: preResponse,
    postAvgResponse: postResponse,
    skills: SKILLS.map(([k, label]) => ({ label, value: avg(all.map((s) => num(s[k]))) })),
    preVsPostSkills,
    byStatus: (Object.keys(STATUS_LABEL) as StudentStatus[]).map((k) => ({
      label: STATUS_LABEL[k],
      value: data.filter((e) => e.status === k).length,
    })),
  };
}

export async function exportResearchXlsx(data: RosterEntry[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) =>
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Ghi chú": "Chưa có dữ liệu" }]),
      name,
    );

  add(
    "Danh_sach_HS",
    data.map((e, i) => ({
      STT: i + 1,
      "Mã NC": e.student.student_code,
      "Họ tên": e.student.full_name,
      Lớp: e.student.class_name ?? "",
      Trường: e.student.school ?? "",
      "Email Google": e.student.email ?? "",
      "Liên kết lúc": e.student.linked_at
        ? new Date(e.student.linked_at).toLocaleString("vi-VN")
        : "",
      "Trạng thái": STATUS_LABEL[e.status],
    })),
  );
  add(
    "Phien_luyen_tap",
    data.flatMap((e) => e.practice.map((s) => sessionRow(e, s))),
  );
  add(
    "Pre_Post_Test",
    data.flatMap((e) => [...e.pre, ...e.post].map((s) => sessionRow(e, s))),
  );
  add(
    "Danh_gia",
    data.flatMap((e) => e.sessions.map((s) => sessionRow(e, s))),
  );
  add(
    "Tien_trinh",
    data
      .filter((e) => e.sessions.length)
      .map((e) => {
        const asc = [...e.sessions].reverse();
        return {
          "Mã NC": e.student.student_code,
          "Họ tên": e.student.full_name,
          "Số phiên": e.sessions.length,
          "Điểm phiên đầu": num(asc[0]?.overall_score),
          "Điểm phiên gần nhất": num(e.sessions[0]?.overall_score),
          "Ngày đầu": new Date(asc[0]!.created_at).toLocaleDateString("vi-VN"),
          "Ngày gần nhất": new Date(e.sessions[0]!.created_at).toLocaleDateString("vi-VN"),
        };
      }),
  );
  add(
    "Bao_cao_ca_nhan",
    data.map((e) => ({
      "Mã NC": e.student.student_code,
      "Họ tên": e.student.full_name,
      "Trạng thái": STATUS_LABEL[e.status],
      Practice: e.practice.length,
      Pre: e.pre.length,
      Post: e.post.length,
      "Điểm TB": avg(e.sessions.map((s) => num(s.overall_score))),
      "Phản hồi TB (s)": avg(e.sessions.map((s) => num(s.response_time_seconds))),
      ...Object.fromEntries(SKILLS.map(([k, l]) => [l, avg(e.sessions.map((s) => num(s[k])))])),
    })),
  );
  const sm = summary(data);
  add(
    "Tong_hop_nghien_cuu",
    [
      ["Tổng số học sinh", sm.total],
      ["Đã liên kết Google", sm.linked],
      ["Đã luyện tập", sm.practiced],
      ["Chưa luyện tập", sm.notPracticed],
      ["Tổng số phiên", sm.sessions],
      ["HS có Pre-test", sm.preStudents],
      ["HS có Post-test", sm.postStudents],
      ["Phiên có transcript", sm.withTranscript],
      ["Điểm tổng thể TB", sm.avgOverall ?? "Chưa đủ dữ liệu"],
      ["Thời gian phản hồi TB (s)", sm.avgResponse ?? "Chưa đủ dữ liệu"],
      ...sm.skills.map((s) => [`TB ${s.label}`, s.value ?? "Chưa đủ dữ liệu"]),
    ].map(([k, v]) => ({ "Chỉ số": k, "Giá trị": v })),
  );
  XLSX.writeFile(
    wb,
    `E2AI_Du_lieu_nghien_cuu_A01-A44_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
