import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { StatCard } from "@/components/e2ai/bits";
import { NoData, StatusBadge, TeacherOnly } from "@/components/e2ai/TeacherBits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  avg,
  fmt,
  kindLabel,
  num,
  SKILLS,
  type SessionRow,
  useTeacherData,
} from "@/lib/e2ai/teacher";
import { resetStudentGoogleLink } from "@/lib/e2ai/auth";

export const Route = createFileRoute("/quan-tri_/hoc-sinh/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Teacher View – ${params.code} – Tiến trình & Báo cáo – E2AI V1` },
      {
        name: "description",
        content: `Tiến trình và báo cáo cá nhân của học sinh ${params.code} (chế độ giáo viên).`,
      },
      { property: "og:title", content: `Học sinh ${params.code} – E2AI V1` },
      {
        property: "og:description",
        content: "Giáo viên xem tiến trình và báo cáo cá nhân của học sinh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentAdminView,
});

function block(title: string, rows: SessionRow[], isPostTest = false) {
  return (
    <Card className="surface-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {isPostTest && rows.length === 0 && (
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 font-normal">
            Chưa hoàn thành
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.length === 0 ? (
          <div className="py-4 text-center">
            {isPostTest ? (
              <p className="text-xs text-muted-foreground italic">
                Học sinh chưa hoàn thành bài kiểm tra sau tác động (Post-test). Không tạo điểm giả.
              </p>
            ) : (
              <NoData text="Chưa có phiên nào được ghi nhận." />
            )}
          </div>
        ) : (
          rows.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                <span>
                  {new Date(s.created_at).toLocaleString("vi-VN")} · {kindLabel(s)} ·{" "}
                  {s.category_label ?? "—"} · Độ khó {s.difficulty ?? "–"}
                </span>
                <span className="font-bold text-foreground text-sm">
                  Điểm: {s.overall_score ?? "–"}/5
                </span>
              </div>
              {s.question && <p className="italic text-xs text-muted-foreground">{s.question}</p>}
              <p className="text-xs bg-muted/30 p-2 rounded border border-border/50">
                <span className="font-semibold text-muted-foreground">Transcript: </span>
                {s.response_text || "Chưa có dữ liệu"}
              </p>
              {Boolean(
                (s as Record<string, unknown>)["audio_url"] ||
                (s as Record<string, unknown>)["audioUrl"],
              ) && (
                <div className="rounded bg-muted/40 p-2">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                    Bản ghi âm giọng nói .webm:
                  </p>
                  <audio
                    controls
                    src={
                      ((s as Record<string, unknown>)["audio_url"] ||
                        (s as Record<string, unknown>)["audioUrl"]) as string
                    }
                    className="w-full h-7"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
                {SKILLS.map(([k, l]) => (
                  <span key={k}>
                    {l}: <b>{s[k] ?? "–"}</b>
                  </span>
                ))}
                <span>· {s.word_count ?? "–"} từ</span>
                <span>· Phản hồi: {s.response_time_seconds ?? "–"}s</span>
              </div>
              {Array.isArray(s.feedback) && s.feedback.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-muted-foreground pt-1">
                  {(s.feedback as string[]).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function StudentAdminView() {
  const { code } = Route.useParams();
  const q = useTeacherData();
  const e = q.data?.find((x) => x.student.student_code === code.toUpperCase());

  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetLink = async () => {
    if (!e) return;
    setResetting(true);
    try {
      await resetStudentGoogleLink(e.student.student_code);
      toast.success(
        `Đã reset liên kết tài khoản cho học sinh ${e.student.student_code} – ${e.student.full_name}. Toàn bộ ${e.sessions.length} bài làm và điểm số được bảo tồn 100%!`,
      );
      await q.refetch();
      setConfirmReset(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi reset liên kết.");
    } finally {
      setResetting(false);
    }
  };

  const isLinked = Boolean(e?.student.linked_user_id || e?.student.email);

  return (
    <AppLayout
      title={e ? `${e.student.student_code} – ${e.student.full_name}` : `Học sinh ${code}`}
      description="Teacher View / Admin View — tiến trình và báo cáo cá nhân, dữ liệu thực từ cơ sở dữ liệu online."
      actions={
        <div className="flex flex-wrap gap-2">
          {isLinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Reset Liên Kết Tài Khoản
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5 mr-1.5" /> In báo cáo
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/quan-tri">← Bảng điều khiển Quản trị</Link>
          </Button>
        </div>
      }
    >
      <TeacherOnly>
        {q.isPending ? (
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu online…</p>
        ) : !e ? (
          <NoData text={`Không có mã ${code} trong danh sách A01–A44.`} />
        ) : (
          <Detail e={e} />
        )}
      </TeacherOnly>

      {/* Dialog xác nhận reset */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-800 flex items-center gap-2">
              <RotateCcw className="size-5" /> Xác nhận Reset Liên Kết Tài Khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-relaxed text-slate-700">
              <p>
                Bạn đang yêu cầu Reset liên kết tài khoản Google cho học sinh:{" "}
                <b className="font-semibold text-slate-900">
                  {e?.student.student_code} – {e?.student.full_name}
                </b>
                .
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                <b>BẢO TỒN DỮ LIỆU BÀI LÀM:</b> Toàn bộ {e?.sessions.length ?? 0} bài làm, điểm
                Pre-test, Luyện tập và Post-test của học sinh này sẽ được BẢO TỒN NGUYÊN VẸN 100%.
                Học sinh sẽ có thể liên kết lại với địa chỉ Gmail chính xác khi đăng nhập.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetLink}
              disabled={resetting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Xác nhận Reset & Bảo tồn Dữ liệu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function Detail({ e }: { e: NonNullable<ReturnType<typeof useTeacherData>["data"]>[number] }) {
  const asc = [...e.sessions].reverse();
  const chart = asc.map((s, i) => ({
    name: `#${i + 1}`,
    "Tổng thể": num(s.overall_score),
    "Phản hồi (s)": num(s.response_time_seconds),
  }));

  const preAvg = e.preAvgOverall;
  const postAvg = e.postAvgOverall;
  const preTime = e.preAvgResponse;
  const postTime = e.postAvgResponse;

  return (
    <div className="space-y-6">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Hồ sơ Học sinh Master</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Mã NC:{" "}
            <strong className="font-mono text-primary font-bold">{e.student.student_code}</strong>
          </p>
          <p>
            Họ tên: <strong>{e.student.full_name}</strong>
          </p>
          <p>Lớp: {e.student.class_name ?? "12A1"}</p>
          <p>Trường: {e.student.school ?? "THPT Đoàn Văn Tố"}</p>
          <p>
            Email Google:{" "}
            {e.student.email ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {e.student.email}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Chưa liên kết
              </Badge>
            )}
          </p>
          <p>
            Trạng thái nghiên cứu: <StatusBadge status={e.status} />
          </p>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold">Tiến trình học sinh</h2>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Tổng số phiên" value={e.sessions.length} />
        <StatCard
          label="Điểm TB toàn bộ"
          value={fmt(avg(e.sessions.map((s) => num(s.overall_score))))}
        />
        <StatCard
          label="Phản hồi TB"
          value={fmt(avg(e.sessions.map((s) => num(s.response_time_seconds))), " s")}
        />
        <StatCard label="Số từ TB" value={fmt(avg(e.sessions.map((s) => num(s.word_count))))} />
      </div>

      {chart.length === 0 ? (
        <NoData />
      ) : (
        <Card className="surface-card">
          <CardContent className="h-64 pt-6">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis yAxisId="l" domain={[0, 5]} fontSize={12} />
                <YAxis yAxisId="r" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line yAxisId="l" dataKey="Tổng thể" stroke="var(--primary)" strokeWidth={2} />
                <Line
                  yAxisId="r"
                  dataKey="Phản hồi (s)"
                  stroke="var(--accent-foreground)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Đối chứng Pre-test vs Post-test */}
      <h2 className="text-xl font-bold">Đối chứng Pre-test vs Post-test</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kết quả Pre-test (Đầu vào)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {e.pre.length ? (
              <>
                <p>
                  Điểm TB:{" "}
                  <strong className="text-base text-blue-700">{preAvg?.toFixed(1)} / 5</strong>
                </p>
                <p>
                  Phản hồi TB: <strong>{preTime?.toFixed(1)} s</strong>
                </p>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-muted-foreground">
                  {SKILLS.map(([k, l]) => (
                    <div key={k}>
                      {l}: <b>{e.preSkills[k]?.toFixed(1) ?? "–"}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic">Chưa làm bài Pre-test.</p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kết quả Post-test (Sau tác động)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {e.post.length ? (
              <>
                <p>
                  Điểm TB:{" "}
                  <strong className="text-base text-emerald-700">{postAvg?.toFixed(1)} / 5</strong>
                </p>
                <p>
                  Phản hồi TB: <strong>{postTime?.toFixed(1)} s</strong>
                </p>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-muted-foreground">
                  {SKILLS.map(([k, l]) => (
                    <div key={k}>
                      {l}: <b>{e.postSkills[k]?.toFixed(1) ?? "–"}</b>
                    </div>
                  ))}
                </div>
                {preAvg !== null && postAvg !== null && (
                  <p className="pt-1 font-semibold text-emerald-700">
                    Đối chứng: Điểm {preAvg.toFixed(1)} → {postAvg.toFixed(1)} (
                    {postAvg >= preAvg ? "+" : ""}
                    {(postAvg - preAvg).toFixed(1)} điểm)
                  </p>
                )}
              </>
            ) : (
              <div className="py-2 space-y-1">
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                  Chưa hoàn thành (Not completed)
                </Badge>
                <p className="text-muted-foreground italic text-[11px]">
                  Học sinh chưa thực hiện bài đánh giá cuối đợt. Tuyệt đối không tạo điểm giả.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold">Chi tiết từng phiên theo giai đoạn</h2>
      {block("1. Pre-test (Kiểm tra đầu vào)", e.pre)}
      {block("2. Luyện tập thích ứng (Practice)", e.practice)}
      {block("3. Post-test (Đánh giá cuối đợt)", e.post, true)}
    </div>
  );
}
