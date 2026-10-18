import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Mic, Printer, Volume2 } from "lucide-react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/e2ai/auth";
import type { OfficialStudent } from "@/lib/e2ai/cloud";
import { exportResearchXlsx, useTeacherData } from "@/lib/e2ai/teacher";

export const Route = createFileRoute("/giao-vien")({
  head: () => ({
    meta: [
      { title: "Lớp học – Giáo viên – E2AI V1" },
      {
        name: "description",
        content: "Danh sách 44 học sinh chính thức A01–A44 và tình trạng liên kết Google.",
      },
      { property: "og:title", content: "Lớp học – Giáo viên – E2AI V1" },
      {
        property: "og:description",
        content: "Giáo viên quản lý danh sách học sinh nghiên cứu E2AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s["code"] === "string" ? { code: s["code"] } : {},
  component: TeacherPage,
});

function TeacherPage() {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const { code } = Route.useSearch();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<OfficialStudent | null>(null);
  const [autoOpened, setAutoOpened] = useState<string | null>(null);
  const teacherQuery = useTeacherData();

  const roster = useQuery({
    queryKey: ["e2ai", "cloud", "roster"],
    enabled: isTeacher,
    queryFn: async () => {
      const [{ data: students, error }, { data: sessions }] = await Promise.all([
        supabase.from("official_students").select("*").order("student_code"),
        supabase.from("practice_sessions").select("*"),
      ]);
      if (error) throw error;
      const counts = new Map<string, number>();
      const studentSessions = new Map<string, Array<Record<string, unknown>>>();
      (sessions ?? []).forEach((s) => {
        counts.set(s.student_id, (counts.get(s.student_id) ?? 0) + 1);
        const list = studentSessions.get(s.student_id) ?? [];
        list.push(s as Record<string, unknown>);
        studentSessions.set(s.student_id, list);
      });
      return { students: (students ?? []) as OfficialStudent[], counts, studentSessions };
    },
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (roster.data?.students ?? []).filter(
      (s) =>
        !term ||
        s.student_code.toLowerCase().includes(term) ||
        s.full_name.toLowerCase().includes(term),
    );
  }, [roster.data, q]);

  if (code && roster.data && autoOpened !== code) {
    const hit = roster.data.students.find((s) => s.student_code === code.toUpperCase());
    setAutoOpened(code);
    if (hit) setOpen(hit);
  }

  if (!isTeacher) {
    return (
      <AppLayout title="Lớp học">
        <p className="text-sm text-muted-foreground">Trang này chỉ dành cho giáo viên.</p>
      </AppLayout>
    );
  }

  const linked = roster.data?.students.filter((s) => s.linked_user_id).length ?? 0;

  const handleExportExcel = async () => {
    if (!teacherQuery.data) return;
    try {
      await exportResearchXlsx(teacherQuery.data);
      toast.success("Đã xuất báo cáo tổng hợp và dữ liệu nghiên cứu dạng Excel.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi xuất Excel.");
    }
  };

  return (
    <AppLayout
      title="Lớp học – 44 học sinh chính thức"
      description={`Giáo viên: Nguyễn Thị Hồng Lam · THPT Đoàn Văn Tố · Tiếng Anh. Đã liên kết Google: ${linked}/44.`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportExcel}
            disabled={!teacherQuery.data}
            className="gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="size-4" />
            <span>Xuất báo cáo tổng hợp (Excel)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!teacherQuery.data}
            className="gap-1.5"
          >
            <Download className="size-4" />
            <span>Xuất dữ liệu nghiên cứu</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" />
            <span>In / Xuất PDF</span>
          </Button>
        </div>
      }
    >
      <Input
        className="mb-4 max-w-sm"
        placeholder="Tìm theo mã hoặc họ tên (ví dụ: A42, Phan Khánh Vy)..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Card className="surface-card">
        <CardContent className="divide-y divide-border p-0">
          {list.map((s) => {
            const n = s.linked_user_id ? (roster.data?.counts.get(s.linked_user_id) ?? 0) : 0;
            const userSes = s.linked_user_id
              ? (roster.data?.studentSessions.get(s.linked_user_id) ?? [])
              : [];
            const hasPre = userSes.some(
              (x) => x["activity_type"] === "diagnostic" || x["activity_type"] === "pretest",
            );
            const hasPost = userSes.some((x) => x["activity_type"] === "posttest");
            const hasAudio = userSes.some((x) => Boolean(x["audio_url"] || x["audioUrl"]));

            return (
              <button
                key={s.student_code}
                onClick={() => setOpen(s)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="w-10 font-mono font-bold text-primary">{s.student_code}</span>
                <span className="min-w-40 flex-1 font-medium">{s.full_name}</span>
                <span className="text-xs text-muted-foreground">{n} phiên</span>
                {hasAudio && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 border-primary/30 text-primary"
                  >
                    <Volume2 className="size-3" /> Audio .webm
                  </Badge>
                )}
                {hasPre ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Pre-test: Có
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Pre-test: Chưa
                  </Badge>
                )}
                {hasPost ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">Post-test: Có</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Post-test: Chưa
                  </Badge>
                )}
                {s.linked_user_id ? (
                  <Badge className="bg-accent text-accent-foreground font-semibold">
                    Đã liên kết Google
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Chưa liên kết
                  </Badge>
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>
      {open && (
        <StudentDialog
          student={open}
          onClose={() => setOpen(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["e2ai", "cloud", "roster"] })}
        />
      )}
    </AppLayout>
  );
}

function StudentDialog({
  student,
  onClose,
  onSaved,
}: {
  student: OfficialStudent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [school, setSchool] = useState(student.school ?? "");
  const [grade, setGrade] = useState(student.grade ?? "");
  const [cls, setCls] = useState(student.class_name ?? "");
  const [resetting, setResetting] = useState(false);

  const code = student.student_code.toUpperCase();
  const uuidKey = `student-uuid-${code.toLowerCase()}`;
  const linkedId = student.linked_user_id;

  const sessions = useQuery({
    queryKey: ["e2ai", "cloud", "student-sessions", code, linkedId],
    queryFn: async () => {
      const keys = [code, uuidKey, ...(linkedId ? [linkedId] : [])];
      const { data } = await supabase
        .from("practice_sessions")
        .select("*")
        .in("student_id", keys)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const save = async () => {
    const { error } = await supabase
      .from("official_students")
      .update({
        school: school || null,
        grade: grade || null,
        class_name: cls || null,
        updated_at: new Date().toISOString(),
      })
      .eq("student_code", student.student_code);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu hồ sơ học sinh.");
    onSaved();
  };

  const unlink = async () => {
    setResetting(true);
    try {
      const { resetStudentGoogleLink } = await import("@/lib/e2ai/auth");
      await resetStudentGoogleLink(student.student_code);
      toast.success(
        `Đã reset liên kết tài khoản cho học sinh ${student.student_code}. Toàn bộ dữ liệu bài làm và điểm số được bảo tồn 100%!`,
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi reset liên kết.");
    } finally {
      setResetting(false);
    }
  };

  const isLinked = Boolean(student.linked_user_id || student.email);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student.student_code} · {student.full_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Email Google: </span>
            {student.email ?? (isLinked ? "Đã liên kết" : "Chưa liên kết")}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Trường</Label>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Khối</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Lớp</Label>
              <Input value={cls} onChange={(e) => setCls(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={save}>Lưu thông tin</Button>
            <Button asChild variant="secondary">
              <Link to="/quan-tri/hoc-sinh/$code" params={{ code: student.student_code }}>
                Xem tiến trình & báo cáo
              </Link>
            </Button>
            {isLinked && (
              <Button
                variant="outline"
                disabled={resetting}
                onClick={unlink}
                className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
              >
                Reset Liên Kết Tài Khoản (Bảo tồn 100% dữ liệu)
              </Button>
            )}
          </div>
          <p className="pt-2 font-semibold">
            Lịch sử bài làm & phiên luyện tập ({sessions.data?.length ?? 0})
          </p>
          {!student.linked_user_id ? (
            <p className="text-muted-foreground">Học sinh chưa đăng nhập.</p>
          ) : sessions.data?.length ? (
            sessions.data.map((s) => (
              <div key={s.id} className="rounded border border-border p-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString("vi-VN")} ·{" "}
                  {s.activity_type === "diagnostic" ? "Kiểm tra đầu vào" : "Luyện tập"} ·{" "}
                  {s.category_label} · Điểm {s.overall_score ?? "–"}
                </p>
                {s.question && <p className="mt-1 text-xs italic">{s.question}</p>}
                <p className="mt-1">{s.response_text || "Chưa có dữ liệu"}</p>
                {Boolean(
                  (s as Record<string, unknown>)["audio_url"] ||
                  (s as Record<string, unknown>)["audioUrl"],
                ) && (
                  <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1.5">
                      <Volume2 className="size-3.5" />
                      <span>Nghe lại bản ghi âm giọng nói (.webm):</span>
                    </div>
                    <audio
                      controls
                      src={
                        ((s as Record<string, unknown>)["audio_url"] ||
                          (s as Record<string, unknown>)["audioUrl"]) as string
                      }
                      className="w-full h-8"
                    />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Lưu loát {s.fluency_score ?? "–"} · Từ vựng {s.vocabulary_score ?? "–"} · Ngữ pháp{" "}
                  {s.grammar_score ?? "–"} · Tương tác {s.interaction_score ?? "–"} · Phù hợp{" "}
                  {s.appropriateness_score ?? "–"} · {s.word_count ?? "–"} từ · phản hồi sau{" "}
                  {s.response_time_seconds ?? "–"}s
                </p>
                {Array.isArray(s.feedback) && s.feedback.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {(s.feedback as string[]).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Chưa có phiên luyện tập.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
