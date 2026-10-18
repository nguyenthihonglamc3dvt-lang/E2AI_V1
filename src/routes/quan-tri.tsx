import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { StatCard } from "@/components/e2ai/bits";
import { NoData, TeacherOnly } from "@/components/e2ai/TeacherBits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  exportResearchXlsx,
  fmt,
  summary,
  useTeacherData,
  type RosterEntry,
} from "@/lib/e2ai/teacher";
import { resetStudentGoogleLink } from "@/lib/e2ai/auth";

export const Route = createFileRoute("/quan-tri")({
  head: () => ({
    meta: [
      { title: "Teacher Admin – Tổng quan & Báo cáo tổng hợp – E2AI V1" },
      {
        name: "description",
        content:
          "Bảng quản trị giáo viên: tổng quan, đối chiếu Pre-test vs Post-test và quản lý 44 học sinh A01–A44 từ dữ liệu thực.",
      },
      { property: "og:title", content: "Teacher Admin Dashboard – E2AI V1" },
      {
        property: "og:description",
        content: "Tổng quan, báo cáo tổng hợp và xuất dữ liệu nghiên cứu 44 học sinh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const q = useTeacherData();
  const data = q.data ?? [];
  const s = summary(data);
  const enough = s.sessions > 0;

  const [search, setSearch] = useState("");
  const [resettingStudent, setResettingStudent] = useState<RosterEntry | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (e) =>
        e.student.student_code.toLowerCase().includes(term) ||
        e.student.full_name.toLowerCase().includes(term) ||
        (e.student.email ?? "").toLowerCase().includes(term),
    );
  }, [data, search]);

  const doExport = async () => {
    try {
      await exportResearchXlsx(data);
      toast.success("Đã xuất tệp Excel dữ liệu nghiên cứu.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể xuất Excel.");
    }
  };

  const handleConfirmResetLink = async () => {
    if (!resettingStudent) return;
    setResetBusy(true);
    try {
      await resetStudentGoogleLink(resettingStudent.student.student_code);
      toast.success(
        `Đã reset liên kết tài khoản cho học sinh ${resettingStudent.student.student_code} – ${resettingStudent.student.full_name}. Toàn bộ ${resettingStudent.sessions.length} bài làm và điểm số được bảo tồn 100%!`,
      );
      await q.refetch();
      setResettingStudent(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể reset liên kết.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <AppLayout
      title="Teacher Admin – Bảng điều khiển Nghiên cứu"
      description="Giáo viên: Nguyễn Thị Hồng Lam · THPT Đoàn Văn Tố · Quản trị dữ liệu thực nghiệm 44 học sinh A01–A44."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={doExport} disabled={!q.data} className="gap-1.5 shadow-sm">
            <FileSpreadsheet className="size-4" /> Xuất báo cáo tổng hợp (Excel)
          </Button>
          <Button variant="outline" onClick={doExport} disabled={!q.data} className="gap-1.5">
            <Download className="size-4" /> Xuất dữ liệu nghiên cứu
          </Button>
          <Button variant="secondary" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" /> In / PDF
          </Button>
        </div>
      }
    >
      <TeacherOnly>
        {q.isPending ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Đang tải dữ liệu thực nghiệm online…</p>
          </div>
        ) : q.error ? (
          <p className="text-sm text-destructive">
            Không tải được dữ liệu: {(q.error as Error).message}
          </p>
        ) : (
          <div className="space-y-6">
            {/* Hàng thẻ thống kê nghiên cứu */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Tổng số học sinh Master"
                value={s.total}
                hint="44 học sinh lớp 12A1"
              />
              <StatCard
                label="Đã liên kết Google"
                value={`${s.linked} / ${s.total}`}
                hint={`Chưa liên kết: ${s.total - s.linked}`}
              />
              <StatCard
                label="Đã luyện tập"
                value={s.practiced}
                hint={`Chưa luyện tập: ${s.notPracticed}`}
              />
              <StatCard
                label="Tổng số phiên ghi nhận"
                value={s.sessions}
                hint={`Luyện tập: ${s.practiceSessions} phiên`}
              />
              <StatCard
                label="HS có Pre-test (Đầu vào)"
                value={`${s.preStudents} / ${s.total}`}
                hint={s.preStudents === s.total ? "100% hoàn thành" : undefined}
                tone="primary"
              />
              <StatCard
                label="HS có Post-test (Sau tác động)"
                value={`${s.postStudents} / ${s.total}`}
                hint={s.postStudents ? `${s.postStudents} em đã làm bài` : "Chưa có dữ liệu"}
                tone="accent"
              />
              <StatCard label="Phiên có transcript/âm thanh" value={s.withTranscript} />
              <StatCard
                label="Phản hồi TB toàn khóa"
                value={enough ? fmt(s.avgResponse, " s") : "—"}
              />
            </div>

            {/* Báo cáo tổng hợp đối chứng Pre-test vs Post-test */}
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Báo cáo tổng hợp nghiên cứu & Đối chứng Pre-test vs Post-test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {!enough ? (
                  <NoData text="Chưa có dữ liệu bài làm được ghi nhận." />
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <p>
                        Điểm tổng thể TB: <strong>{fmt(s.avgOverall)} / 5</strong>
                      </p>
                      <p>
                        Số từ TB / phiên: <strong>{fmt(s.avgWords)} từ</strong>
                      </p>
                      <p>
                        Thời gian phản hồi TB: <strong>{fmt(s.avgResponse, " s")}</strong>
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border p-4 bg-card">
                        <p className="font-semibold mb-2 text-foreground text-xs uppercase tracking-wider">
                          Phát triển 5 kỹ năng (Toàn bộ các phiên)
                        </p>
                        <div className="h-60">
                          <ResponsiveContainer>
                            <BarChart
                              data={s.skills.map((k) => ({ name: k.label, value: k.value ?? 0 }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="name" fontSize={11} />
                              <YAxis domain={[0, 5]} fontSize={11} />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                name="Điểm TB"
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                            Đối chứng kỹ năng: Pre-test vs Post-test
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {s.postStudents
                              ? `${s.postStudents} học sinh có Post-test`
                              : "Chưa có học sinh làm Post-test"}
                          </span>
                        </div>
                        <div className="h-60">
                          <ResponsiveContainer>
                            <BarChart data={s.preVsPostSkills}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="name" fontSize={11} />
                              <YAxis domain={[0, 5]} fontSize={11} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: "11px" }} />
                              <Bar
                                dataKey="Pre-test"
                                name="Pre-test (Đầu vào)"
                                fill="#94a3b8"
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="Post-test"
                                name={
                                  s.postStudents
                                    ? "Post-test (Cuối đợt)"
                                    : "Post-test (Chưa hoàn thành)"
                                }
                                fill={s.postStudents ? "#10b981" : "#e2e8f0"}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-muted/40 p-3 text-xs border border-border">
                      <div>
                        <span className="text-muted-foreground">Điểm Pre-test TB: </span>
                        <strong>{fmt(s.preAvgOverall)} / 5</strong> ·
                        <span className="text-muted-foreground ml-2">Phản hồi Pre TB: </span>
                        <strong>{fmt(s.preAvgResponse, " s")}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Điểm Post-test TB: </span>
                        {s.postStudents ? (
                          <>
                            <strong className="text-emerald-600">
                              {fmt(s.postAvgOverall)} / 5
                            </strong>{" "}
                            ·<span className="text-muted-foreground ml-2">Phản hồi Post TB: </span>
                            <strong className="text-emerald-600">
                              {fmt(s.postAvgResponse, " s")}
                            </strong>
                          </>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            Chưa hoàn thành (Chưa có học sinh làm Post-test)
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* BẢNG QUẢN LÝ 44 HỌC SINH MASTER & ĐỐI CHỨNG DỰ BÀI */}
            <Card className="surface-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Danh sách 44 Học sinh Master (A01–A44) & Quản lý Dự bài
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Đối chiếu chi tiết Pre-test, Luyện tập, Post-test của từng em. Nút "Reset Liên
                    Kết" bảo tồn 100% dữ liệu bài làm.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã hoặc họ tên..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground border-y border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Mã HS</th>
                        <th className="py-2.5 px-3 font-semibold">Họ và tên</th>
                        <th className="py-2.5 px-3 font-semibold">Tài khoản Google</th>
                        <th className="py-2.5 px-3 font-semibold">Pre-test (Đầu vào)</th>
                        <th className="py-2.5 px-3 font-semibold">Luyện tập</th>
                        <th className="py-2.5 px-3 font-semibold">Post-test (Cuối đợt)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground">
                            Không tìm thấy học sinh phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((entry) => {
                          const {
                            student,
                            pre,
                            post,
                            practice,
                            preAvgOverall,
                            preAvgResponse,
                            postAvgOverall,
                            postAvgResponse,
                          } = entry;
                          const isLinked = Boolean(student.linked_user_id || student.email);

                          return (
                            <tr
                              key={student.student_code}
                              className="hover:bg-muted/40 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-primary">
                                {student.student_code}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                                <Link
                                  to="/quan-tri/hoc-sinh/$code"
                                  params={{ code: student.student_code }}
                                  className="hover:underline text-primary"
                                >
                                  {student.full_name}
                                </Link>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isLinked ? (
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                      <UserCheck className="size-3 mr-1" />
                                      {student.email || "Đã liên kết"}
                                    </Badge>
                                  </div>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-muted-foreground"
                                  >
                                    Chưa liên kết
                                  </Badge>
                                )}
                              </td>

                              {/* Dữ liệu Pre-test */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {pre.length > 0 && preAvgOverall !== null ? (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-blue-700">
                                      {preAvgOverall.toFixed(1)} / 5.0
                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        ({preAvgResponse ? `${preAvgResponse.toFixed(1)}s` : ""})
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      F:{entry.preSkills["fluency_score"]?.toFixed(1) ?? "–"} · V:
                                      {entry.preSkills["vocabulary_score"]?.toFixed(1) ?? "–"} · G:
                                      {entry.preSkills["grammar_score"]?.toFixed(1) ?? "–"}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">
                                    Chưa làm
                                  </span>
                                )}
                              </td>

                              {/* Dữ liệu Luyện tập */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {practice.length > 0 ? (
                                  <div>
                                    <span className="font-semibold text-purple-700">
                                      {practice.length} phiên
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">
                                    Chưa luyện tập
                                  </span>
                                )}
                              </td>

                              {/* Dữ liệu Post-test (KHÔNG TỰ TẠO ĐIỂM GIẢ) */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {post.length > 0 && postAvgOverall !== null ? (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-emerald-700">
                                      {postAvgOverall.toFixed(1)} / 5.0
                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        ({postAvgResponse ? `${postAvgResponse.toFixed(1)}s` : ""})
                                      </span>
                                    </div>
                                    {preAvgOverall !== null && (
                                      <div className="text-[10px] font-bold text-emerald-600">
                                        Δ {postAvgOverall >= preAvgOverall ? "+" : ""}
                                        {(postAvgOverall - preAvgOverall).toFixed(1)} điểm
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-slate-50 text-slate-500 font-normal border-slate-200"
                                  >
                                    Chưa hoàn thành
                                  </Badge>
                                )}
                              </td>

                              {/* Thao tác quản lý */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                                    <Link
                                      to="/quan-tri/hoc-sinh/$code"
                                      params={{ code: student.student_code }}
                                    >
                                      Báo cáo
                                    </Link>
                                  </Button>

                                  {isLinked && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setResettingStudent(entry)}
                                      className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                                    >
                                      <RotateCcw className="size-3 mr-1" /> Reset Liên Kết
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button asChild variant="secondary">
                <Link to="/giao-vien">Quản lý lớp học 44 học sinh</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/quan-tri/du-lieu">Dữ liệu nghiên cứu toàn bộ</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/nhat-ky-phat-trien">Nhật ký phát triển (NK-01 đến NK-03)</Link>
              </Button>
            </div>
          </div>
        )}
      </TeacherOnly>

      {/* DIALOG XÁC NHẬN RESET LIÊN KẾT TÀI KHOẢN (BẢO TỒN 100% DỮ LIỆU BÀI LÀM) */}
      <AlertDialog
        open={Boolean(resettingStudent)}
        onOpenChange={(open) => !open && setResettingStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-800 flex items-center gap-2">
              <RotateCcw className="size-5" /> Xác nhận Reset Liên Kết Tài Khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-relaxed text-slate-700">
              <p>
                Bạn đang yêu cầu Reset liên kết tài khoản Google cho học sinh:{" "}
                <b className="font-semibold text-slate-900">
                  {resettingStudent?.student.student_code} – {resettingStudent?.student.full_name}
                </b>{" "}
                (Email hiện tại: <i>{resettingStudent?.student.email || "Đã liên kết"}</i>).
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                <b>ĐẢM BẢO KỸ THUẬT NGHIÊN CỨU:</b> Thao tác này chỉ gỡ bỏ liên kết địa chỉ Gmail bị
                chọn nhầm để học sinh có thể liên kết lại với tài khoản chính xác.{" "}
                <span className="font-bold underline">
                  Toàn bộ {resettingStudent?.sessions.length ?? 0} bài làm, điểm Pre-test, Luyện
                  tập, Post-test và file ghi âm .webm của học sinh được BẢO TỒN NGUYÊN VẸN 100%.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetBusy}>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetLink}
              disabled={resetBusy}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetBusy && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Xác nhận Reset & Bảo tồn Dữ liệu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
