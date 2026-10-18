import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { DemoBanner, EmptyData, NeedProfile, ScoreBars } from "@/components/e2ai/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { overallScore, prototypeLevel, SKILL_SHORT } from "@/lib/e2ai/scoring";
import {
  recommendationFromSessions,
  skillAverages,
  strongestSkill,
  weakestSkill,
} from "@/lib/e2ai/adaptive";
import { exportSessionsCsv } from "@/lib/e2ai/exporters";
import type { Scores } from "@/lib/e2ai/types";

export const Route = createFileRoute("/bao-cao")({
  head: () => ({
    meta: [
      { title: "Báo cáo cá nhân – E2AI V1" },
      {
        name: "description",
        content:
          "Báo cáo tiến trình học tập cá nhân E2AI V1: điểm baseline, phát triển 5 kỹ năng, điểm mạnh, điểm cần cải thiện và đề xuất luyện tập.",
      },
      { property: "og:title", content: "Báo cáo cá nhân – E2AI V1" },
      {
        property: "og:description",
        content: "Bản báo cáo A4 in được, tạo hoàn toàn từ dữ liệu luyện tập thật của học sinh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { student, sessions, hydrated } = useCurrentStudent();

  if (!hydrated) return <AppLayout title="Báo cáo cá nhân">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout title="Báo cáo cá nhân" description="Báo cáo tiến trình học tập cá nhân.">
        <NeedProfile />
      </AppLayout>
    );

  const diagnostic = sessions.filter((s) => s.kind === "diagnostic");
  const diagnosticScore = diagnostic.length
    ? overallScore(skillAverages(diagnostic) as Scores)
    : null;
  const posttest = sessions.filter((s) => s.kind === "posttest");
  const posttestScore = posttest.length ? overallScore(skillAverages(posttest) as Scores) : null;
  const preAvgTime = diagnostic.length
    ? diagnostic.reduce((s, x) => s + x.responseTimeSeconds, 0) / diagnostic.length
    : null;
  const postAvgTime = posttest.length
    ? posttest.reduce((s, x) => s + x.responseTimeSeconds, 0) / posttest.length
    : null;
  const preSkills: Scores | null = diagnostic.length ? (skillAverages(diagnostic) as Scores) : null;
  const postSkills: Scores | null = posttest.length ? (skillAverages(posttest) as Scores) : null;

  const avgTime = sessions.length
    ? sessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / sessions.length
    : 0;
  const avgOverall = sessions.length
    ? sessions.reduce((s, x) => s + x.overall, 0) / sessions.length
    : 0;
  const averages = skillAverages(sessions);
  const weakest = weakestSkill(sessions);
  const strongest = strongestSkill(sessions);
  const recommendation = recommendationFromSessions(sessions);
  const chrono = [...sessions].reverse();
  const firstTime = chrono[0]?.responseTimeSeconds;
  const lastTime = chrono[chrono.length - 1]?.responseTimeSeconds;

  const summary: string[] = [];
  if (sessions.length) {
    summary.push(
      `Học sinh đã hoàn thành ${sessions.length} phiên luyện tập (trong đó ${diagnostic.length} nhiệm vụ kiểm tra đầu vào).`,
    );
    summary.push(`Điểm tổng thể trung bình là ${avgOverall.toFixed(1)}/5.`);
    if (chrono.length >= 2 && firstTime !== undefined && lastTime !== undefined) {
      const direction = lastTime < firstTime ? "giảm" : lastTime > firstTime ? "tăng" : "không đổi";
      summary.push(
        `Thời gian phản hồi ${direction} từ ${firstTime.toFixed(1)} giây ở phiên đầu tiên xuống ${lastTime.toFixed(1)} giây ở phiên gần nhất.`,
      );
    }
    if (strongest && weakest) {
      summary.push(
        `Kỹ năng cao nhất là ${SKILL_SHORT[strongest.skill]} (${strongest.avg.toFixed(1)}/5); kỹ năng thấp nhất là ${SKILL_SHORT[weakest.skill]} (${weakest.avg.toFixed(1)}/5).`,
      );
    }
  }

  return (
    <AppLayout
      title="Báo cáo cá nhân"
      description="Bản báo cáo được tạo từ dữ liệu đã lưu, phù hợp in trên giấy A4."
      actions={
        <>
          <Button
            onClick={() => {
              try {
                exportSessionsCsv(student, sessions);
                toast.success("Đã xuất dữ liệu báo cáo dạng CSV.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Không thể xuất báo cáo.");
              }
            }}
          >
            <Download className="size-4" /> Xuất báo cáo
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" /> In báo cáo
          </Button>
        </>
      }
    >
      {student.isDemo && <DemoBanner />}
      <Card className="surface-card print-area">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <header className="border-b border-border pb-4">
            <h2 className="text-xl font-extrabold uppercase">
              E2AI V1 – Individual Learning Progress Report
            </h2>
            <p className="text-sm text-muted-foreground">
              Báo cáo tiến trình học tập cá nhân · Ngày lập:{" "}
              {new Date().toLocaleDateString("vi-VN")}
            </p>
          </header>

          <section className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 print-break">
            <Row label="Mã học sinh" value={student.studentId} />
            <Row label="Họ và tên" value={student.fullName} />
            <Row label="Lớp" value={student.className} />
            <Row label="Trường" value={student.school} />
            <Row label="Mục tiêu học tập" value={student.learningGoal} />
            <Row
              label="Điểm kiểm tra đầu vào (Pre-test)"
              value={
                diagnosticScore !== null ? `${diagnosticScore.toFixed(1)} / 5` : "Chưa thực hiện"
              }
            />
            <Row
              label="Điểm đánh giá cuối đợt (Post-test)"
              value={posttestScore !== null ? `${posttestScore.toFixed(1)} / 5` : "Chưa thực hiện"}
            />
            <Row label="Số phiên luyện tập" value={String(sessions.length)} />
            <Row
              label="Thời gian phản hồi TB"
              value={sessions.length ? `${avgTime.toFixed(1)} giây` : "—"}
            />
            <Row
              label="Điểm tổng thể TB"
              value={sessions.length ? `${avgOverall.toFixed(1)} / 5` : "—"}
            />
            <Row
              label="Cấp độ nguyên mẫu"
              value={sessions.length ? prototypeLevel(avgOverall).label : "—"}
            />
          </section>

          {sessions.length === 0 ? (
            <EmptyData message="Chưa có dữ liệu luyện tập. Hãy hoàn thành ít nhất một phiên để tạo báo cáo." />
          ) : (
            <>
              <Section title="A. Phát triển kỹ năng">
                <ScoreBars scores={averages as Scores} />
              </Section>

              <Section title="B. Đối chứng kết quả Pre-test vs Post-test (Đánh giá can thiệp E2AI)">
                {!diagnostic.length && !posttest.length ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có đủ dữ liệu Pre-test và Post-test để đối chứng.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="py-2 px-3 font-semibold">Chỉ số đánh giá</th>
                            <th className="py-2 px-3 font-semibold text-center">
                              Pre-test (Đầu vào)
                            </th>
                            <th className="py-2 px-3 font-semibold text-center">
                              Post-test (Cuối đợt)
                            </th>
                            <th className="py-2 px-3 font-semibold text-right">
                              Mức độ thay đổi (Δ)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="py-2 px-3 font-medium">Điểm tổng thể (Overall)</td>
                            <td className="py-2 px-3 text-center">
                              {diagnosticScore !== null ? `${diagnosticScore.toFixed(1)} / 5` : "—"}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-primary">
                              {posttestScore !== null ? `${posttestScore.toFixed(1)} / 5` : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {diagnosticScore !== null && posttestScore !== null ? (
                                <span
                                  className={
                                    posttestScore >= diagnosticScore
                                      ? "text-emerald-600 font-bold"
                                      : "text-amber-600 font-bold"
                                  }
                                >
                                  {posttestScore >= diagnosticScore ? "+" : ""}
                                  {(posttestScore - diagnosticScore).toFixed(1)} điểm
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium">Thời gian phản hồi (giây)</td>
                            <td className="py-2 px-3 text-center">
                              {preAvgTime !== null ? `${preAvgTime.toFixed(1)}s` : "—"}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-primary">
                              {postAvgTime !== null ? `${postAvgTime.toFixed(1)}s` : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {preAvgTime !== null && postAvgTime !== null ? (
                                <span
                                  className={
                                    postAvgTime <= preAvgTime
                                      ? "text-emerald-600 font-bold"
                                      : "text-amber-600 font-bold"
                                  }
                                >
                                  {preAvgTime >= postAvgTime ? "Giảm " : "Tăng "}
                                  {Math.abs(preAvgTime - postAvgTime).toFixed(1)}s
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                          {(
                            [
                              "fluency",
                              "vocabulary",
                              "grammar",
                              "interaction",
                              "appropriateness",
                            ] as const
                          ).map((k) => {
                            const preV = preSkills ? preSkills[k] : null;
                            const postV = postSkills ? postSkills[k] : null;
                            const delta = preV !== null && postV !== null ? postV - preV : null;
                            return (
                              <tr key={k}>
                                <td className="py-1.5 px-3 text-muted-foreground">
                                  {SKILL_SHORT[k]}
                                </td>
                                <td className="py-1.5 px-3 text-center">
                                  {preV !== null ? preV.toFixed(1) : "—"}
                                </td>
                                <td className="py-1.5 px-3 text-center font-medium">
                                  {postV !== null ? postV.toFixed(1) : "—"}
                                </td>
                                <td className="py-1.5 px-3 text-right">
                                  {delta !== null ? (
                                    <span
                                      className={
                                        delta >= 0
                                          ? "text-emerald-600 font-medium"
                                          : "text-amber-600"
                                      }
                                    >
                                      {delta >= 0 ? "+" : ""}
                                      {delta.toFixed(1)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Section>

              <Section title="C. Tiến trình theo thời gian">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1.5 pr-3">Phiên</th>
                        <th className="py-1.5 pr-3">Ngày</th>
                        <th className="py-1.5 pr-3">Nhóm</th>
                        <th className="py-1.5 pr-3">Thời gian (giây)</th>
                        <th className="py-1.5">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chrono.map((s, i) => (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="py-1.5 pr-3">#{i + 1}</td>
                          <td className="py-1.5 pr-3">
                            {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="py-1.5 pr-3">{s.categoryLabel}</td>
                          <td className="py-1.5 pr-3 tabular-nums">
                            {s.responseTimeSeconds.toFixed(1)}
                          </td>
                          <td className="py-1.5 font-semibold tabular-nums">
                            {s.overall.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="C. Điểm mạnh">
                <p className="text-sm text-muted-foreground">
                  {strongest
                    ? `${SKILL_SHORT[strongest.skill]} đạt trung bình ${strongest.avg.toFixed(1)}/5 — cao nhất trong 5 chỉ báo.`
                    : "—"}
                </p>
              </Section>

              <Section title="D. Cần cải thiện">
                <p className="text-sm text-muted-foreground">
                  {weakest
                    ? `${SKILL_SHORT[weakest.skill]} đạt trung bình ${weakest.avg.toFixed(1)}/5 — thấp nhất trong 5 chỉ báo.`
                    : "—"}
                </p>
              </Section>

              <Section title="E. Đề xuất thích ứng">
                {recommendation ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-bold text-primary">{recommendation.title}</p>
                    <p>{recommendation.reason}</p>
                    <p>{recommendation.difficultyNote}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </Section>

              <Section title="F. Tổng kết học tập">
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {summary.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          <footer className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Note: E2AI V1 scores are prototype indicators for this student research project and are
            not official language proficiency scores. Student Engineering Research Prototype –
            Version 1.0.
          </footer>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-break space-y-2">
      <h3 className="text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}
