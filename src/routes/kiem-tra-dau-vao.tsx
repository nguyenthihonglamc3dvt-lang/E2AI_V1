import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import {
  EmptyData,
  NeedProfile,
  PrototypeNotice,
  ScoreBars,
  StatCard,
} from "@/components/e2ai/bits";
import { TaskRunner } from "@/components/e2ai/TaskRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIAGNOSTIC_TASKS } from "@/lib/e2ai/content";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { overallScore, prototypeLevel } from "@/lib/e2ai/scoring";
import { skillAverages } from "@/lib/e2ai/adaptive";
import type { Scores } from "@/lib/e2ai/types";

export const Route = createFileRoute("/kiem-tra-dau-vao")({
  head: () => ({
    meta: [
      { title: "Kiểm tra đầu vào – E2AI V1" },
      {
        name: "description",
        content:
          "5 nhiệm vụ phản xạ nói tiếng Anh giúp E2AI xác định mức xuất phát (baseline) của từng học sinh.",
      },
      { property: "og:title", content: "Kiểm tra đầu vào – E2AI V1" },
      {
        property: "og:description",
        content: "Đo thời gian phản hồi và điểm nguyên mẫu ban đầu trên 5 nhiệm vụ nói.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticPage,
});

function DiagnosticPage() {
  const { student, sessions, hydrated } = useCurrentStudent();
  const [index, setIndex] = useState(0);

  const diagnostic = sessions.filter((s) => s.kind === "diagnostic");
  const done = diagnostic.length >= DIAGNOSTIC_TASKS.length;
  const task = DIAGNOSTIC_TASKS[Math.min(index, DIAGNOSTIC_TASKS.length - 1)]!;

  const baseline: Scores | null = diagnostic.length ? (skillAverages(diagnostic) as Scores) : null;
  const baselineOverall = baseline ? overallScore(baseline) : 0;
  const baselineTime = diagnostic.length
    ? diagnostic.reduce((s, x) => s + x.responseTimeSeconds, 0) / diagnostic.length
    : 0;

  if (!hydrated) return <AppLayout title="Kiểm tra đầu vào">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout title="Kiểm tra đầu vào" description="Bài kiểm tra ban đầu gồm 5 nhiệm vụ nói.">
        <NeedProfile />
      </AppLayout>
    );

  return (
    <AppLayout
      title="Kiểm tra đầu vào"
      description="5 nhiệm vụ phản xạ nói. Kết quả được dùng làm mức xuất phát (baseline) cho tiến trình cá nhân."
    >
      <div className="space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Baseline hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostic.length === 0 ? (
              <EmptyData message="Chưa có dữ liệu kiểm tra đầu vào. Hãy hoàn thành nhiệm vụ bên dưới." />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Nhiệm vụ đã làm" value={`${diagnostic.length}/5`} />
                  <StatCard
                    label="Điểm baseline"
                    value={`${baselineOverall.toFixed(1)} / 5`}
                    hint={prototypeLevel(baselineOverall).label}
                    tone="primary"
                  />
                  <StatCard
                    label="Thời gian phản hồi TB"
                    value={`${baselineTime.toFixed(1)} giây`}
                  />
                </div>
                {baseline && <ScoreBars scores={baseline} />}
              </>
            )}
            <PrototypeNotice />
          </CardContent>
        </Card>

        {done ? (
          <Card className="surface-card">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                Bạn đã hoàn thành đủ 5 nhiệm vụ kiểm tra đầu vào. Hãy chuyển sang luyện tập thích
                ứng.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/luyen-tap">Luyện tập ngay</Link>
                </Button>
                <Button variant="outline" onClick={() => setIndex(0)}>
                  Làm lại nhiệm vụ 1
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <TaskRunner
          student={student}
          task={task}
          categoryId="diagnostic"
          categoryLabel="Initial Diagnostic"
          kind="diagnostic"
          previousSessions={sessions}
          index={index}
          total={DIAGNOSTIC_TASKS.length}
          onSaved={() => {
            if (index < DIAGNOSTIC_TASKS.length - 1) {
              window.setTimeout(() => setIndex((i) => i + 1), 1200);
            }
          }}
        />

        <div className="flex flex-wrap gap-2 no-print">
          {DIAGNOSTIC_TASKS.map((t, i) => (
            <Button
              key={t.id}
              size="sm"
              variant={i === index ? "default" : "outline"}
              onClick={() => setIndex(i)}
            >
              Nhiệm vụ {i + 1}
            </Button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
