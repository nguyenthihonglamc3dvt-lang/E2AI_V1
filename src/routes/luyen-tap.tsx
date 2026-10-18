import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { NeedProfile } from "@/components/e2ai/bits";
import { TaskRunner } from "@/components/e2ai/TaskRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_LABELS, PRACTICE_CATEGORIES } from "@/lib/e2ai/content";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { recommendationFromSessions } from "@/lib/e2ai/adaptive";

export const Route = createFileRoute("/luyen-tap")({
  head: () => ({
    meta: [
      { title: "Luyện tập – E2AI V1" },
      {
        name: "description",
        content:
          "8 nhóm tình huống luyện phản xạ nói tiếng Anh: đời sống học đường, tuổi teen, mạng xã hội, môi trường, phỏng vấn và tình huống bất ngờ.",
      },
      { property: "og:title", content: "Luyện tập – E2AI V1" },
      {
        property: "og:description",
        content:
          "Bấm Bắt đầu, trả lời bằng tiếng Anh và nhận điểm nguyên mẫu cùng đề xuất thích ứng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const { student, sessions, hydrated } = useCurrentStudent();
  const recommendation = recommendationFromSessions(sessions);
  const [categoryId, setCategoryId] = useState(PRACTICE_CATEGORIES[0]!.id);
  const category = PRACTICE_CATEGORIES.find((c) => c.id === categoryId)!;
  const [taskId, setTaskId] = useState(category.tasks[0]!.id);

  const task = useMemo(
    () => category.tasks.find((t) => t.id === taskId) ?? category.tasks[0]!,
    [category, taskId],
  );

  if (!hydrated) return <AppLayout title="Luyện tập">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout title="Luyện tập" description="Chọn chủ đề và luyện phản xạ nói tiếng Anh.">
        <NeedProfile />
      </AppLayout>
    );

  return (
    <AppLayout
      title="Luyện tập"
      description="Chọn nhóm tình huống, bấm Bắt đầu để đo thời gian phản hồi, sau đó nộp câu trả lời bằng tiếng Anh."
    >
      <div className="space-y-6">
        {recommendation && (
          <Card className="surface-card border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Đề xuất luyện tập tiếp theo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-bold text-primary">{recommendation.title}</p>
              <p className="text-muted-foreground">{recommendation.reason}</p>
              <p className="text-muted-foreground">{recommendation.difficultyNote}</p>
              <p className="pt-1 text-muted-foreground">
                Độ khó đề xuất: <strong>{DIFFICULTY_LABELS[recommendation.nextDifficulty]}</strong>
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {PRACTICE_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={c.id === categoryId ? "default" : "outline"}
              onClick={() => {
                setCategoryId(c.id);
                setTaskId(c.tasks[0]!.id);
              }}
            >
              {c.letter}. {c.label}
            </Button>
          ))}
        </div>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">
              {category.letter}. {category.label}{" "}
              <span className="font-normal text-muted-foreground">— {category.labelVi}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {category.tasks.map((t, i) => (
              <Button
                key={t.id}
                size="sm"
                variant={t.id === task.id ? "secondary" : "ghost"}
                className="border border-border"
                onClick={() => setTaskId(t.id)}
              >
                Tình huống {i + 1}
                <Badge variant="outline" className="ml-1">
                  Lv {t.difficulty}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>

        <TaskRunner
          student={student}
          task={task}
          categoryId={category.id}
          categoryLabel={category.label}
          kind="practice"
          previousSessions={sessions}
          onSaved={() => {}}
        />
      </div>
    </AppLayout>
  );
}
