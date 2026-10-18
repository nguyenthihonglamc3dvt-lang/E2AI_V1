import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/e2ai/auth";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  LibraryBig,
  Mic,
  TrendingDown,
  TrendingUp,
  Volume2,
  Zap,
} from "lucide-react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { DemoBanner, NeedProfile, PrototypeNotice, StatCard } from "@/components/e2ai/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { overallScore, prototypeLevel } from "@/lib/e2ai/scoring";
import { recommendationFromSessions, skillAverages } from "@/lib/e2ai/adaptive";
import type { Scores } from "@/lib/e2ai/types";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E2AI V1 – Trang chủ luyện phản xạ nói tiếng Anh" },
      {
        name: "description",
        content:
          "Bảng điều khiển E2AI V1: số phiên luyện tập, thời gian phản hồi trung bình, điểm tổng thể và tiến trình cá nhân của học sinh.",
      },
      { property: "og:title", content: "E2AI V1 – Trang chủ" },
      {
        property: "og:description",
        content:
          "Luyện phản xạ nói tiếng Anh, theo dõi dữ liệu học tập cá nhân và xuất báo cáo tiến trình.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { isTeacher } = useAuth();
  if (isTeacher) return <Navigate to="/quan-tri" replace />;
  return <StudentHome />;
}

export function StudentHome() {
  const { official } = useAuth();
  const { student: localStudent, sessions: localSessions, hydrated } = useCurrentStudent();

  const student =
    localStudent ??
    (official
      ? {
          studentId: official.student_code,
          fullName: official.full_name,
          className: official.class_name ?? "12A1",
          school: official.school ?? "THPT Đoàn Văn Tố",
          learningGoal: "General English improvement" as const,
          createdAt: new Date().toISOString(),
        }
      : null);

  const studentId = student?.studentId;
  const sessions = studentId
    ? localSessions.filter((s) => s.studentId === studentId)
    : localSessions;

  // Tách biệt chính xác 3 loại dữ liệu theo chuẩn nghiên cứu:
  const preSessions = sessions.filter((s) => s.kind === "diagnostic");
  const postSessions = sessions.filter((s) => s.kind === "posttest");
  const practiceSessions = sessions.filter((s) => s.kind === "practice");

  // Dữ liệu Pre-test
  const hasPre = preSessions.length > 0;
  const preScores: Scores | null = hasPre ? (skillAverages(preSessions) as Scores) : null;
  const preOverall = preScores ? overallScore(preScores) : null;
  const preTime = hasPre
    ? preSessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / preSessions.length
    : null;

  // Dữ liệu Post-test (chỉ tính khi học sinh đã làm thật, KHÔNG TỰ TẠO ĐIỂM GIẢ)
  const hasPost = postSessions.length > 0;
  const postScores: Scores | null = hasPost ? (skillAverages(postSessions) as Scores) : null;
  const postOverall = postScores ? overallScore(postScores) : null;
  const postTime = hasPost
    ? postSessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / postSessions.length
    : null;

  // Dữ liệu Luyện tập
  const hasPractice = practiceSessions.length > 0;
  const practiceScores: Scores | null = hasPractice
    ? (skillAverages(practiceSessions) as Scores)
    : null;
  const practiceOverall = practiceScores ? overallScore(practiceScores) : null;
  const practiceTime = hasPractice
    ? practiceSessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / practiceSessions.length
    : null;

  // Tổng thể
  const avgTime = sessions.length
    ? sessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / sessions.length
    : 0;
  const avgOverall = sessions.length
    ? sessions.reduce((s, x) => s + x.overall, 0) / sessions.length
    : 0;
  const level = prototypeLevel(avgOverall);
  const recommendation = recommendationFromSessions(sessions);

  // Biểu đồ đối chứng 5 kỹ năng
  const comparisonData = [
    {
      skill: "Lưu loát (Fluency)",
      "Pre-test": preScores?.fluency ?? 0,
      "Post-test": postScores?.fluency ?? 0,
    },
    {
      skill: "Từ vựng (Vocabulary)",
      "Pre-test": preScores?.vocabulary ?? 0,
      "Post-test": postScores?.vocabulary ?? 0,
    },
    {
      skill: "Ngữ pháp (Grammar)",
      "Pre-test": preScores?.grammar ?? 0,
      "Post-test": postScores?.grammar ?? 0,
    },
    {
      skill: "Tương tác (Interaction)",
      "Pre-test": preScores?.interaction ?? 0,
      "Post-test": postScores?.interaction ?? 0,
    },
    {
      skill: "Phù hợp (Appropriateness)",
      "Pre-test": preScores?.appropriateness ?? 0,
      "Post-test": postScores?.appropriateness ?? 0,
    },
  ];

  return (
    <AppLayout
      title="E2AI V1 – Bảng điều khiển học tập"
      description="Hệ thống luyện phản xạ nói tiếng Anh và theo dõi tiến trình cá nhân dành cho học sinh THPT Đoàn Văn Tố."
    >
      <div className="space-y-6">
        {/* Banner điều hướng nghiên cứu */}
        <section className="gradient-hero relative overflow-hidden rounded-2xl p-6 text-primary-foreground sm:p-8">
          <Badge className="bg-primary-foreground/15 text-primary-foreground font-semibold">
            Chu trình thực nghiệm: Pre-test → Kho học tập → Luyện tập thích ứng → Post-test
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Luyện phản xạ nói tiếng Anh theo dữ liệu thực của bạn
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85">
            Dữ liệu phát âm, thời gian phản hồi và điểm 5 tiêu chí được tự động ghi nhận minh bạch,
            giúp bạn theo dõi mức độ tiến bộ qua từng đợt luyện tập.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button asChild variant="secondary" size="sm">
              <Link to="/kiem-tra-dau-vao">
                <Clock className="size-4 mr-1.5" /> 1. Pre-test (Đầu vào)
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/kho-hoc-tap">
                <LibraryBig className="size-4 mr-1.5" /> 2. Kho học tập (A–H)
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/luyen-tap">
                <Mic className="size-4 mr-1.5" /> 3. Luyện tập thích ứng
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/danh-gia-cuoi-dot">
                <Award className="size-4 mr-1.5" /> 4. Post-test (Cuối đợt)
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/tien-trinh">
                <BarChart3 className="size-4 mr-1.5" /> 5. Xem tiến trình
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/bao-cao">
                <FileText className="size-4 mr-1.5" /> 6. Báo cáo đối chứng
              </Link>
            </Button>
          </div>
        </section>

        {!hydrated ? null : !student ? (
          <NeedProfile />
        ) : (
          <>
            {student.isDemo && <DemoBanner />}

            {/* Chỉ số nhanh */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Học sinh"
                value={student.fullName}
                hint={`Mã: ${student.studentId} · Lớp ${student.className}`}
              />
              <StatCard
                label="Cấp độ nguyên mẫu"
                value={sessions.length ? level.label : "Chưa xác định"}
                hint="Dựa trên điểm trung bình thực tế"
                tone="primary"
              />
              <StatCard
                label="Tổng số phiên"
                value={sessions.length}
                hint={`Pre: ${preSessions.length} · Luyện tập: ${practiceSessions.length} · Post: ${postSessions.length}`}
              />
              <StatCard
                label="Phản hồi trung bình"
                value={sessions.length ? `${avgTime.toFixed(1)} giây` : "—"}
                hint={
                  avgTime > 0 && avgTime <= 6 ? "Phản xạ nhanh (<6s)" : "Cần tiếp tục cải thiện"
                }
                tone="accent"
              />
            </div>

            {/* PHẦN ĐỐI CHỨNG DỮ LIỆU NGHIÊN CỨU: PRE-TEST VS LUYỆN TẬP VS POST-TEST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="size-5 text-amber-500" />
                    <span>Hồ sơ Dữ liệu Nghiên cứu Thực nghiệm</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi và đối chứng rõ ràng: Dữ liệu đầu vào (Pre-test), Quá trình luyện tập
                    và Kết quả đánh giá cuối đợt (Post-test).
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* 1. DỮ LIỆU ĐẦU VÀO (PRE-TEST) */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Clock className="size-4 text-blue-600" />
                        <span>1. Pre-test (Đầu vào)</span>
                      </CardTitle>
                      {hasPre ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          Đã hoàn thành ({preSessions.length} câu)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Chưa hoàn thành
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {hasPre && preOverall !== null ? (
                      <>
                        <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-medium">Điểm TB đầu vào:</span>
                            <span className="text-base font-extrabold text-blue-700">
                              {preOverall.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Thời gian phản hồi TB:</span>
                            <span className="font-semibold text-slate-800">
                              {preTime ? `${preTime.toFixed(1)}s` : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <p className="font-semibold text-slate-700 text-[11px]">
                            5 Tiêu chí đánh giá ban đầu:
                          </p>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div>
                              Lưu loát: <b>{preScores?.fluency.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Từ vựng: <b>{preScores?.vocabulary.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Ngữ pháp: <b>{preScores?.grammar.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Tương tác: <b>{preScores?.interaction.toFixed(1)}/5</b>
                            </div>
                            <div className="col-span-2">
                              Phù hợp ngữ cảnh: <b>{preScores?.appropriateness.toFixed(1)}/5</b>
                            </div>
                          </div>
                        </div>

                        <Button asChild variant="outline" size="sm" className="w-full mt-2">
                          <Link to="/kiem-tra-dau-vao">Xem lại bài Pre-test</Link>
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <HelpCircle className="size-8 text-slate-300 mx-auto" />
                        <p className="text-slate-500">
                          Bạn chưa làm bài kiểm tra đầu vào (Pre-test 5 câu).
                        </p>
                        <Button asChild size="sm" className="w-full">
                          <Link to="/kiem-tra-dau-vao">Làm Pre-test ngay</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. DỮ LIỆU LUYỆN TẬP THÍCH ỨNG */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Mic className="size-4 text-purple-600" />
                        <span>2. Quá trình luyện tập</span>
                      </CardTitle>
                      {hasPractice ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                          {practiceSessions.length} phiên
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Chưa luyện tập
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {hasPractice && practiceOverall !== null ? (
                      <>
                        <div className="rounded-lg bg-purple-50/70 p-3 border border-purple-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-medium">Điểm TB luyện tập:</span>
                            <span className="text-base font-extrabold text-purple-700">
                              {practiceOverall.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Thời gian phản hồi TB:</span>
                            <span className="font-semibold text-slate-800">
                              {practiceTime ? `${practiceTime.toFixed(1)}s` : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <p className="font-semibold text-slate-700 text-[11px]">
                            Điểm kỹ năng trung bình:
                          </p>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <div>
                              Lưu loát: <b>{practiceScores?.fluency.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Từ vựng: <b>{practiceScores?.vocabulary.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Ngữ pháp: <b>{practiceScores?.grammar.toFixed(1)}/5</b>
                            </div>
                            <div>
                              Tương tác: <b>{practiceScores?.interaction.toFixed(1)}/5</b>
                            </div>
                            <div className="col-span-2">
                              Phù hợp ngữ cảnh:{" "}
                              <b>{practiceScores?.appropriateness.toFixed(1)}/5</b>
                            </div>
                          </div>
                        </div>

                        <Button asChild variant="outline" size="sm" className="w-full mt-2">
                          <Link to="/luyen-tap">Luyện tập thêm nhiệm vụ</Link>
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <Mic className="size-8 text-slate-300 mx-auto" />
                        <p className="text-slate-500">Chưa có phiên luyện tập nào được ghi nhận.</p>
                        <Button asChild size="sm" className="w-full">
                          <Link to="/luyen-tap">Bắt đầu luyện tập</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. BÀI KIỂM TRA SAU TÁC ĐỘNG (POST-TEST) */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Award className="size-4 text-emerald-600" />
                        <span>3. Post-test (Sau tác động)</span>
                      </CardTitle>
                      {hasPost ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Đã hoàn thành ({postSessions.length} câu)
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-slate-100 text-slate-600 font-medium"
                        >
                          Chưa hoàn thành
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {hasPost && postOverall !== null ? (
                      <>
                        <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-medium">Điểm TB cuối đợt:</span>
                            <span className="text-base font-extrabold text-emerald-700">
                              {postOverall.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Thời gian phản hồi TB:</span>
                            <span className="font-semibold text-slate-800">
                              {postTime ? `${postTime.toFixed(1)}s` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Đối chứng tiến bộ so với Pre-test */}
                        {preOverall !== null && (
                          <div className="rounded-md bg-slate-50 p-2 border border-slate-200 text-[11px] space-y-1">
                            <p className="font-semibold text-slate-700">Đối chứng với Pre-test:</p>
                            <div className="flex items-center justify-between">
                              <span>Mức tăng điểm:</span>
                              <span
                                className={`font-bold flex items-center gap-0.5 ${postOverall >= preOverall ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {postOverall >= preOverall ? (
                                  <TrendingUp className="size-3" />
                                ) : (
                                  <TrendingDown className="size-3" />
                                )}
                                {postOverall >= preOverall ? "+" : ""}
                                {(postOverall - preOverall).toFixed(1)} điểm
                              </span>
                            </div>
                            {preTime !== null && postTime !== null && (
                              <div className="flex items-center justify-between">
                                <span>Thời gian phản xạ:</span>
                                <span className="font-bold text-emerald-600">
                                  {preTime > postTime
                                    ? `Nhanh hơn ${(preTime - postTime).toFixed(1)}s`
                                    : `${(postTime - preTime).toFixed(1)}s`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <Button asChild variant="outline" size="sm" className="w-full mt-2">
                          <Link to="/danh-gia-cuoi-dot">Xem chi tiết Post-test</Link>
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <Award className="size-8 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-700 text-xs">
                            Chưa hoàn thành (Not completed)
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Học sinh luyện tập thích ứng theo lộ trình trước khi làm bài kiểm tra
                            cuối đợt. Tuyệt đối không tạo điểm giả.
                          </p>
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link to="/danh-gia-cuoi-dot">Thực hiện bài Post-test</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* BIỂU ĐỒ ĐỐI CHỨNG 5 KỸ NĂNG NẾU CÓ DỮ LIỆU */}
              {hasPre && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">
                        Biểu đồ đối chứng 5 kỹ năng (Pre-test vs Post-test)
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {hasPost
                          ? "Đã có dữ liệu đối chứng 2 đợt"
                          : "Đang chờ học sinh hoàn thành Post-test"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparisonData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                          <YAxis
                            domain={[0, 5]}
                            ticks={[0, 1, 2, 3, 4, 5]}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          <Bar
                            dataKey="Pre-test"
                            name="Pre-test (Đầu vào)"
                            fill="#64748b"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Post-test"
                            name={
                              hasPost ? "Post-test (Sau tác động)" : "Post-test (Chưa hoàn thành)"
                            }
                            fill={hasPost ? "#10b981" : "#cbd5e1"}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Đề xuất luyện tập thích ứng */}
            {recommendation && (
              <Card className="surface-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    <span>Đề xuất thuật toán thích ứng tiếp theo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-base font-bold text-primary">{recommendation.title}</p>
                  <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
                  <p className="text-xs text-muted-foreground">{recommendation.difficultyNote}</p>
                  <Button asChild className="mt-2">
                    <Link to="/luyen-tap">
                      Vào luyện tập ngay <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* NHẬT KÝ LUYỆN TẬP THỰC TẾ THEO THỜI GIAN (GẦN ĐÂY) */}
            <Card className="surface-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Nhật ký luyện tập thực tế theo thời gian
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lưu toàn bộ phát âm, thời gian phản hồi mili-giây và bản ghi âm giọng nói .webm.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/tien-trinh">Xem toàn bộ ({sessions.length})</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Chưa có nhật ký luyện tập. Hãy bắt đầu với bài Pre-test (Kiểm tra đầu vào).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="rounded-xl border border-slate-200 p-3.5 space-y-2 bg-slate-50/50 hover:bg-white transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={
                                s.kind === "diagnostic"
                                  ? "bg-blue-100 text-blue-800"
                                  : s.kind === "posttest"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-800"
                              }
                            >
                              {s.kind === "diagnostic"
                                ? "Pre-test"
                                : s.kind === "posttest"
                                  ? "Post-test"
                                  : "Luyện tập"}
                            </Badge>
                            <span className="font-medium text-xs text-slate-800">
                              {s.categoryLabel || "Chủ đề giao tiếp"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(s.createdAt).toLocaleString("vi-VN")}
                            </span>
                            <span className="font-bold text-primary">
                              Điểm: {s.overall.toFixed(1)}/5
                            </span>
                            <span className="text-slate-600 font-mono">
                              Phản hồi: {s.responseTimeSeconds.toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        {s.question && (
                          <p className="text-xs italic text-slate-600">Câu hỏi: "{s.question}"</p>
                        )}
                        <p className="text-xs text-slate-800 bg-white p-2 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-500">Transcript: </span>
                          {s.response || "Chưa có văn bản"}
                        </p>

                        {/* Nghe lại ghi âm .webm nếu có */}
                        {s.audioUrl && (
                          <div className="flex items-center gap-2 bg-blue-50/60 p-2 rounded-md border border-blue-100">
                            <Volume2 className="size-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] font-medium text-blue-900 shrink-0">
                              Ghi âm .webm:
                            </span>
                            <audio controls src={s.audioUrl} className="h-7 w-full max-w-xs" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <PrototypeNotice />
          </>
        )}
      </div>
    </AppLayout>
  );
}
