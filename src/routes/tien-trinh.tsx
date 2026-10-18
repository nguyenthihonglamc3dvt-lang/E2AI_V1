import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Volume2 } from "lucide-react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import {
  DemoBanner,
  EmptyData,
  NeedProfile,
  PrototypeNotice,
  ScoreBars,
  StatCard,
} from "@/components/e2ai/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { prototypeLevel, SKILL_SHORT } from "@/lib/e2ai/scoring";
import {
  recommendationFromSessions,
  skillAverages,
  strongestSkill,
  weakestSkill,
} from "@/lib/e2ai/adaptive";
import type { Session, SkillKey } from "@/lib/e2ai/types";

export const Route = createFileRoute("/tien-trinh")({
  head: () => ({
    meta: [
      { title: "Tiến trình cá nhân – E2AI V1" },
      {
        name: "description",
        content:
          "Biểu đồ điểm tổng thể, thời gian phản hồi, so sánh 5 kỹ năng và lịch sử phiên luyện tập của từng học sinh.",
      },
      { property: "og:title", content: "Tiến trình cá nhân – E2AI V1" },
      {
        property: "og:description",
        content:
          "Toàn bộ biểu đồ được vẽ từ dữ liệu luyện tập thật của học sinh, không có dữ liệu giả.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

const NO_DATA = "Chưa đủ dữ liệu để tạo biểu đồ.";

function ProgressPage() {
  const { student, sessions, hydrated } = useCurrentStudent();
  const [selected, setSelected] = useState<Session | null>(null);

  if (!hydrated) return <AppLayout title="Tiến trình cá nhân">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout title="Tiến trình cá nhân" description="Dữ liệu luyện tập thật của bạn.">
        <NeedProfile />
      </AppLayout>
    );

  const chrono = [...sessions].reverse();
  const avgTime = sessions.length
    ? sessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / sessions.length
    : 0;
  const avgOverall = sessions.length
    ? sessions.reduce((s, x) => s + x.overall, 0) / sessions.length
    : 0;
  const best = sessions.length ? Math.max(...sessions.map((s) => s.overall)) : 0;
  const averages = skillAverages(sessions);
  const weakest = weakestSkill(sessions);
  const strongest = strongestSkill(sessions);
  const recommendation = recommendationFromSessions(sessions);

  const timeline = chrono.map((s, i) => ({
    name: `#${i + 1}`,
    overall: s.overall,
    time: s.responseTimeSeconds,
  }));
  const radar = (Object.keys(averages) as SkillKey[]).map((k) => ({
    skill: SKILL_SHORT[k],
    value: averages[k],
  }));
  const byCategory = Object.values(
    sessions.reduce<Record<string, { name: string; sessions: number }>>((acc, s) => {
      acc[s.categoryLabel] = {
        name: s.categoryLabel,
        sessions: (acc[s.categoryLabel]?.sessions ?? 0) + 1,
      };
      return acc;
    }, {}),
  );

  return (
    <AppLayout
      title="Tiến trình cá nhân"
      description="Tất cả biểu đồ và số liệu dưới đây được tính từ dữ liệu luyện tập đã lưu của bạn."
    >
      {student.isDemo && <DemoBanner />}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng số phiên" value={sessions.length} />
          <StatCard
            label="Thời gian phản hồi TB"
            value={sessions.length ? `${avgTime.toFixed(1)} giây` : "—"}
          />
          <StatCard
            label="Điểm tổng thể TB"
            value={sessions.length ? `${avgOverall.toFixed(1)} / 5` : "—"}
            tone="accent"
          />
          <StatCard
            label="Cấp độ nguyên mẫu"
            value={sessions.length ? prototypeLevel(avgOverall).label : "—"}
            hint="Không phải phân loại CEFR"
            tone="primary"
          />
          <StatCard label="Điểm cao nhất" value={sessions.length ? best.toFixed(1) : "—"} />
          <StatCard
            label="Điểm gần nhất"
            value={sessions[0] ? sessions[0].overall.toFixed(1) : "—"}
          />
          <StatCard
            label="Kỹ năng yếu nhất"
            value={weakest ? SKILL_SHORT[weakest.skill] : "—"}
            hint={weakest ? `TB ${weakest.avg.toFixed(1)}/5` : undefined}
          />
          <StatCard
            label="Kỹ năng mạnh nhất"
            value={strongest ? SKILL_SHORT[strongest.skill] : "—"}
            hint={strongest ? `TB ${strongest.avg.toFixed(1)}/5` : undefined}
          />
        </div>

        {recommendation && (
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Đề xuất luyện tập tiếp theo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-bold text-primary">{recommendation.title}</p>
              <p className="text-muted-foreground">{recommendation.reason}</p>
              <p className="text-muted-foreground">{recommendation.difficultyNote}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="1. Điểm tổng thể theo thời gian">
            {timeline.length < 2 ? (
              <EmptyData message={NO_DATA} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="2. Thời gian phản hồi theo thời gian (giây)">
            {timeline.length < 2 ? (
              <EmptyData message={NO_DATA} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="time" stroke="var(--chart-3)" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="3. So sánh 5 kỹ năng">
            {sessions.length === 0 ? (
              <EmptyData message={NO_DATA} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="skill" fontSize={11} stroke="var(--muted-foreground)" />
                  <Radar
                    dataKey="value"
                    stroke="var(--chart-1)"
                    fill="var(--chart-2)"
                    fillOpacity={0.45}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="4. Số phiên theo nhóm chủ đề">
            {byCategory.length === 0 ? (
              <EmptyData message={NO_DATA} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    stroke="var(--muted-foreground)"
                    interval={0}
                    angle={-15}
                    dy={8}
                  />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Lịch sử phiên luyện tập</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyData message="Chưa có phiên luyện tập nào được lưu." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Tình huống</TableHead>
                      <TableHead>Nhóm</TableHead>
                      <TableHead>Độ khó</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Ghi âm</TableHead>
                      <TableHead>Flu</TableHead>
                      <TableHead>Voc</TableHead>
                      <TableHead>Gra</TableHead>
                      <TableHead>Int</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Overall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(s)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="max-w-56 truncate">{s.scenario}</TableCell>
                        <TableCell className="whitespace-nowrap">{s.categoryLabel}</TableCell>
                        <TableCell>Lv {s.difficulty}</TableCell>
                        <TableCell className="tabular-nums">
                          {s.responseTimeSeconds.toFixed(1)}s
                        </TableCell>
                        <TableCell>
                          {s.audioUrl ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                              <Volume2 className="size-3" /> Audio
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{s.scores.fluency}</TableCell>
                        <TableCell>{s.scores.vocabulary}</TableCell>
                        <TableCell>{s.scores.grammar}</TableCell>
                        <TableCell>{s.scores.interaction}</TableCell>
                        <TableCell>{s.scores.appropriateness}</TableCell>
                        <TableCell className="font-bold">{s.overall.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <PrototypeNotice />
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phiên luyện tập</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    selected.kind === "posttest"
                      ? "default"
                      : selected.kind === "diagnostic"
                        ? "outline"
                        : "secondary"
                  }
                  className={selected.kind === "posttest" ? "bg-emerald-600 text-white" : ""}
                >
                  {selected.kind === "diagnostic"
                    ? "Pre-test (Đầu vào)"
                    : selected.kind === "posttest"
                      ? "Post-test (Cuối đợt)"
                      : "Luyện tập"}
                </Badge>
                <Badge variant="secondary">{selected.categoryLabel}</Badge>
                <Badge variant="outline">Lv {selected.difficulty}</Badge>
                <Badge variant="outline">
                  {new Date(selected.createdAt).toLocaleString("vi-VN")}
                </Badge>
              </div>
              <div>
                <p className="font-bold">Câu hỏi gốc</p>
                <p className="text-muted-foreground">{selected.scenario}</p>
                <p className="text-muted-foreground">{selected.question}</p>
              </div>
              <div>
                <p className="font-bold">Câu trả lời của học sinh (Script / Transcript)</p>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-foreground font-mono text-xs">
                  {selected.response}
                </p>
              </div>
              {selected.audioUrl && (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Volume2 className="size-4 text-primary" /> Bản ghi âm giọng nói học sinh
                      (.webm)
                    </p>
                    <a
                      href={selected.audioUrl}
                      download={`e2ai-${selected.kind}-${selected.id}.webm`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      <Download className="size-3.5" /> Tải về (.webm)
                    </a>
                  </div>
                  <audio controls src={selected.audioUrl} className="w-full h-8 mt-1" />
                </div>
              )}
              <p>
                <span className="font-bold">Thời gian phản hồi: </span>
                {selected.responseTimeSeconds.toFixed(1)} giây · {selected.wordCount} từ
              </p>
              <ScoreBars scores={selected.scores} />
              <p className="text-base font-extrabold text-primary">
                Overall: {selected.overall.toFixed(1)} / 5
              </p>
              <div>
                <p className="font-bold">Nhận xét</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {selected.feedback.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-primary-soft p-3">
                <p className="font-bold">Đề xuất thích ứng</p>
                <p className="text-primary">{selected.recommendation.title}</p>
                <p className="text-muted-foreground">{selected.recommendation.reason}</p>
                <p className="text-muted-foreground">{selected.recommendation.difficultyNote}</p>
              </div>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Đóng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="surface-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
