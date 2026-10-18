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
import { POST_TEST_TASKS } from "@/lib/e2ai/content";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { overallScore, prototypeLevel } from "@/lib/e2ai/scoring";
import { skillAverages } from "@/lib/e2ai/adaptive";
import type { Scores } from "@/lib/e2ai/types";
import { ArrowRight, Award, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/danh-gia-cuoi-dot")({
  head: () => ({
    meta: [
      { title: "Đánh giá cuối đợt (Post-test) – E2AI V1" },
      {
        name: "description",
        content:
          "5 nhiệm vụ phản xạ nói chuẩn hóa sau quá trình luyện tập thích ứng với E2AI, dùng để đối chứng với kết quả đầu vào (Pre-test).",
      },
      { property: "og:title", content: "Đánh giá cuối đợt (Post-test) – E2AI V1" },
      {
        property: "og:description",
        content:
          "Đo lường sự tiến bộ về thời gian phản hồi và 5 kỹ năng nói sau đợt can thiệp E2AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostTestPage,
});

function PostTestPage() {
  const { student, sessions, hydrated } = useCurrentStudent();
  const [index, setIndex] = useState(0);

  const postSessions = sessions.filter((s) => s.kind === "posttest");
  const preSessions = sessions.filter((s) => s.kind === "diagnostic");
  const done = postSessions.length >= POST_TEST_TASKS.length;
  const task = POST_TEST_TASKS[Math.min(index, POST_TEST_TASKS.length - 1)]!;

  const postScores: Scores | null = postSessions.length
    ? (skillAverages(postSessions) as Scores)
    : null;
  const postOverall = postScores ? overallScore(postScores) : 0;
  const postTime = postSessions.length
    ? postSessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / postSessions.length
    : 0;

  const preScores: Scores | null = preSessions.length
    ? (skillAverages(preSessions) as Scores)
    : null;
  const preOverall = preScores ? overallScore(preScores) : null;
  const preTime = preSessions.length
    ? preSessions.reduce((s, x) => s + x.responseTimeSeconds, 0) / preSessions.length
    : null;

  const deltaScore = preOverall !== null && postScores ? postOverall - preOverall : null;
  const deltaTime = preTime !== null && postSessions.length ? preTime - postTime : null;

  if (!hydrated) return <AppLayout title="Đánh giá cuối đợt">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout
        title="Đánh giá cuối đợt (Post-test)"
        description="5 nhiệm vụ đánh giá chuẩn hóa cuối đợt nghiên cứu."
      >
        <NeedProfile />
      </AppLayout>
    );

  return (
    <AppLayout
      title="Đánh giá cuối đợt (Post-test)"
      description="5 nhiệm vụ phản xạ nói chuẩn hóa sau quá trình luyện tập, dùng để đối chứng với kết quả ban đầu (Pre-test) cho đề tài nghiên cứu."
    >
      <div className="space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="size-5 text-primary" /> Kết quả Post-test & Đối chứng Pre-test
              </CardTitle>
              {done && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <CheckCircle2 className="size-4" /> Đã hoàn thành 5/5
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {postSessions.length === 0 ? (
              <EmptyData message="Chưa có dữ liệu đánh giá cuối đợt (Post-test). Hãy hoàn thành các nhiệm vụ bên dưới sau khi đã luyện tập đủ số phiên." />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <StatCard label="Nhiệm vụ đã làm" value={`${postSessions.length}/5`} />
                  <StatCard
                    label="Điểm Post-test"
                    value={`${postOverall.toFixed(1)} / 5`}
                    hint={
                      deltaScore !== null
                        ? `So với Pre-test: ${deltaScore >= 0 ? "+" : ""}${deltaScore.toFixed(1)} điểm`
                        : prototypeLevel(postOverall).label
                    }
                    tone="primary"
                  />
                  <StatCard
                    label="Thời gian phản hồi TB"
                    value={`${postTime.toFixed(1)} giây`}
                    hint={
                      deltaTime !== null
                        ? `Cải thiện tốc độ: ${deltaTime >= 0 ? "+" : ""}${deltaTime.toFixed(1)}s`
                        : undefined
                    }
                  />
                  <StatCard
                    label="Đối chứng Pre → Post"
                    value={
                      preOverall !== null
                        ? `${preOverall.toFixed(1)} → ${postOverall.toFixed(1)}`
                        : "Chưa có Pre-test"
                    }
                    hint={
                      preOverall !== null && deltaScore !== null
                        ? deltaScore >= 0
                          ? `Tăng ${(deltaScore * 20).toFixed(0)}% hiệu suất`
                          : "Cần rèn luyện thêm"
                        : "Làm Pre-test để đối chứng"
                    }
                    tone="accent"
                  />
                </div>
                {postScores && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Phân bổ 5 kỹ năng ở bài Post-test
                    </p>
                    <ScoreBars scores={postScores} />
                  </div>
                )}
              </>
            )}
            <PrototypeNotice />
          </CardContent>
        </Card>

        {done ? (
          <Card className="surface-card border-accent/40 bg-accent/5">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <div className="flex items-center gap-2 text-accent-foreground font-bold">
                <CheckCircle2 className="size-5" />
                <span>Em đã hoàn thành đủ 5 nhiệm vụ đánh giá cuối đợt (Post-test)!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Kết quả đã được ghi nhận vào cơ sở dữ liệu nghiên cứu để giáo viên và học sinh xuất
                báo cáo đối chứng Pre/Post-test.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link to="/bao-cao">
                    Xem báo cáo cá nhân A4 <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/tien-trinh">Xem biểu đồ tiến trình</Link>
                </Button>
                <Button variant="ghost" onClick={() => setIndex(0)}>
                  Xem / Làm lại bài kiểm tra
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <TaskRunner
          student={student}
          task={task}
          categoryId="posttest"
          categoryLabel="Final Post-test"
          kind="posttest"
          previousSessions={sessions}
          index={index}
          total={POST_TEST_TASKS.length}
          onSaved={() => {
            if (index < POST_TEST_TASKS.length - 1) {
              window.setTimeout(() => setIndex((i) => i + 1), 1200);
            }
          }}
        />

        <div className="flex flex-wrap gap-2 no-print">
          {POST_TEST_TASKS.map((t, i) => (
            <Button
              key={t.id}
              size="sm"
              variant={i === index ? "default" : "outline"}
              onClick={() => setIndex(i)}
            >
              Post-test {i + 1}
            </Button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
