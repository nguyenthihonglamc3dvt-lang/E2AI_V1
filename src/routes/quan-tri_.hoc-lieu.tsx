import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { StatCard } from "@/components/e2ai/bits";
import { TeacherOnly } from "@/components/e2ai/TeacherBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/e2ai/auth";
import { PRACTICE_CATEGORIES } from "@/lib/e2ai/content";
import {
  LEVELS,
  TYPE_LABELS,
  useAllProgress,
  useInvalidateLearning,
  useLearningData,
  type Resource,
} from "@/lib/e2ai/learning";

export const Route = createFileRoute("/quan-tri_/hoc-lieu")({
  head: () => ({
    meta: [
      { title: "Quản lý học liệu – Teacher Admin – E2AI V1" },
      {
        name: "description",
        content:
          "Giáo viên quản lý chủ đề, từ vựng, cấu trúc, mẫu câu và gợi ý nói của Kho học tập E2AI.",
      },
      { property: "og:title", content: "Quản lý học liệu – E2AI V1" },
      {
        property: "og:description",
        content: "Thêm, sửa, xuất bản học liệu và xem mức sử dụng Kho học tập.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagePage,
});

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
type Draft = Partial<Resource>;
const EMPTY: Draft = { resource_type: "vocabulary", level: "A2", published: false };

function ManagePage() {
  const { user, isTeacher } = useAuth();
  const data = useLearningData();
  const usage = useAllProgress(isTeacher);
  const refresh = useInvalidateLearning();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [newTopic, setNewTopic] = useState({
    title: "",
    title_vi: "",
    practice_category: "school-life",
  });
  const [filterTopic, setFilterTopic] = useState("");
  const topics = data.data?.topics ?? [];
  const resources = (data.data?.resources ?? []).filter(
    (r) => !filterTopic || r.topic_id === filterTopic,
  );
  const u = usage.data ?? [];

  const run = async (p: PromiseLike<{ error: unknown }>, ok: string) => {
    const { error } = await p;
    if (error) toast.error((error as Error).message ?? "Lỗi");
    else {
      toast.success(ok);
      refresh();
    }
  };

  const save = async () => {
    if (!draft.topic_id || !draft.title?.trim()) {
      toast.error("Cần chọn chủ đề và nhập tiêu đề.");
      return;
    }
    const row = {
      topic_id: draft.topic_id,
      resource_type: draft.resource_type!,
      level: draft.level!,
      title: draft.title.trim(),
      part_of_speech: draft.part_of_speech || null,
      meaning: draft.meaning || null,
      notes: draft.notes || null,
      example: draft.example || null,
      function_label: draft.function_label || null,
      published: !!draft.published,
      updated_at: new Date().toISOString(),
    };
    await run(
      draft.id
        ? supabase.from("learning_resources").update(row).eq("id", draft.id)
        : supabase.from("learning_resources").insert({ ...row, created_by: user?.id ?? null }),
      "Đã lưu học liệu.",
    );
    setDraft(EMPTY);
  };

  const f = (k: keyof Draft) => ({
    value: (draft[k] as string) ?? "",
    onChange: (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value }),
  });

  return (
    <AppLayout
      title="📚 Quản lý học liệu"
      description="Quản lý Kho học tập: chủ đề, từ vựng, cấu trúc, mẫu câu giao tiếp và gợi ý nói."
    >
      <TeacherOnly>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Chủ đề" value={topics.length} />
            <StatCard
              label="Học liệu (đã xuất bản)"
              value={`${(data.data?.resources ?? []).filter((r) => r.published).length}/${data.data?.resources.length ?? 0}`}
            />
            <StatCard label="Học sinh đã dùng" value={new Set(u.map((x) => x.user_id)).size} />
            <StatCard
              label="Lượt đánh dấu Đã học"
              value={u.filter((x) => x.status === "learned").length}
            />
          </div>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Thêm chủ đề</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="Tên tiếng Anh"
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              />
              <Input
                className="max-w-xs"
                placeholder="Tên tiếng Việt"
                value={newTopic.title_vi}
                onChange={(e) => setNewTopic({ ...newTopic, title_vi: e.target.value })}
              />
              <select
                className={sel}
                value={newTopic.practice_category}
                onChange={(e) => setNewTopic({ ...newTopic, practice_category: e.target.value })}
                aria-label="Nhóm luyện tập liên kết"
              >
                {PRACTICE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    Luyện tập: {c.letter}. {c.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  if (!newTopic.title.trim()) return;
                  void run(
                    supabase
                      .from("learning_topics")
                      .insert({ ...newTopic, sort_order: topics.length + 1 }),
                    "Đã thêm chủ đề.",
                  );
                  setNewTopic({ ...newTopic, title: "", title_vi: "" });
                }}
              >
                Thêm
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">
                {draft.id ? "Sửa học liệu" : "Thêm học liệu"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select className={sel} {...f("topic_id")} aria-label="Chủ đề">
                <option value="">— Chọn chủ đề —</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select className={sel} {...f("resource_type")} aria-label="Loại">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select className={sel} {...f("level")} aria-label="Trình độ">
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
              <Input placeholder="Từ / cấu trúc / mẫu câu / câu hỏi gợi ý" {...f("title")} />
              <Input placeholder="Từ loại (cho từ vựng)" {...f("part_of_speech")} />
              <Input placeholder="Nghĩa / chức năng (tiếng Việt)" {...f("meaning")} />
              <Input placeholder="Chức năng giao tiếp (cho mẫu câu)" {...f("function_label")} />
              <Textarea
                placeholder="Giải thích / ý chính, từ vựng, cấu trúc gợi ý"
                {...f("notes")}
              />
              <Textarea placeholder="Ví dụ (ngắn)" {...f("example")} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />{" "}
                Xuất bản cho học sinh
              </label>
              <div className="flex gap-2 sm:justify-end">
                {draft.id && (
                  <Button variant="outline" onClick={() => setDraft(EMPTY)}>
                    Hủy
                  </Button>
                )}
                <Button onClick={() => void save()}>Lưu</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Danh sách học liệu</CardTitle>
              <select
                className={sel}
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                aria-label="Lọc chủ đề"
              >
                <option value="">Tất cả chủ đề</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {resources.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Badge variant="secondary">
                    {TYPE_LABELS[r.resource_type as keyof typeof TYPE_LABELS]}
                  </Badge>
                  <Badge variant="outline">{r.level}</Badge>
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {topics.find((t) => t.id === r.topic_id)?.title} ·{" "}
                    {u.filter((x) => x.resource_id === r.id && x.status === "learned").length} đã
                    học
                  </span>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void run(
                          supabase
                            .from("learning_resources")
                            .update({ published: !r.published })
                            .eq("id", r.id),
                          r.published ? "Đã ẩn." : "Đã xuất bản.",
                        )
                      }
                    >
                      {r.published ? "Ẩn" : "Xuất bản"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDraft(r);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Sửa
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </TeacherOnly>
    </AppLayout>
  );
}
