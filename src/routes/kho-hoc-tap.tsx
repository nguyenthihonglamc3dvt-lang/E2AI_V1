import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mic, Search, Star } from "lucide-react";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { StatCard } from "@/components/e2ai/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/e2ai/auth";
import {
  LEVELS,
  STATUS_LABELS,
  TYPE_LABELS,
  useLearningData,
  useMyProgress,
  useSetProgress,
  type LearnStatus,
  type Progress,
  type Resource,
  type ResourceType,
} from "@/lib/e2ai/learning";

export const Route = createFileRoute("/kho-hoc-tap")({
  head: () => ({
    meta: [
      { title: "Kho học tập – E2AI V1" },
      {
        name: "description",
        content:
          "Từ vựng, cấu trúc, mẫu câu giao tiếp và gợi ý nói theo chủ đề để chuẩn bị luyện nói với E2AI.",
      },
      { property: "og:title", content: "Kho học tập – E2AI V1" },
      {
        property: "og:description",
        content:
          "Learn the language. Practise with confidence. Học → Luyện → Nói → Theo dõi tiến bộ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearningPage,
});

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function LearningPage() {
  const { user } = useAuth();
  const data = useLearningData();
  const prog = useMyProgress(user?.id);
  const setP = useSetProgress(user?.id);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const topics = data.data?.topics ?? [];
  const resources = (data.data?.resources ?? []).filter((r) => r.published);
  const pmap = useMemo(
    () => new Map((prog.data ?? []).map((p) => [p.resource_id, p])),
    [prog.data],
  );
  const topicName = (id: string) => topics.find((t) => t.id === id);

  const list = resources.filter((r) => {
    const p = pmap.get(r.id);
    const st = (p?.status ?? "not_started") as LearnStatus;
    const t = topicName(r.topic_id);
    const hay =
      `${r.title} ${r.meaning ?? ""} ${r.example ?? ""} ${r.function_label ?? ""} ${t?.title ?? ""} ${t?.title_vi ?? ""}`.toLowerCase();
    return (
      (!q || hay.includes(q.toLowerCase())) &&
      (!topic || r.topic_id === topic) &&
      (!level || r.level === level) &&
      (!type || r.resource_type === type) &&
      (!status || st === status) &&
      (!favOnly || p?.favorite)
    );
  });

  const learned = (t: ResourceType) =>
    resources.filter((r) => r.resource_type === t && pmap.get(r.id)?.status === "learned").length;
  const topicsStudied = new Set(
    resources
      .filter((r) => {
        const s = pmap.get(r.id)?.status;
        return s === "learning" || s === "learned";
      })
      .map((r) => r.topic_id),
  ).size;
  const favs = (prog.data ?? []).filter((p) => p.favorite).length;
  const selectedTopic = topic ? topicName(topic) : undefined;

  return (
    <AppLayout
      title="📚 Kho học tập"
      description="Learn the language. Practise with confidence. — Học → Luyện → Nói → Theo dõi tiến bộ."
    >
      <div className="space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">📈 Tiến độ học tập</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Từ vựng đã học" value={learned("vocabulary")} />
            <StatCard label="Cấu trúc đã học" value={learned("structure")} />
            <StatCard label="Mẫu câu đã học" value={learned("pattern")} />
            <StatCard label="Gợi ý nói đã học" value={learned("idea")} />
            <StatCard label="Chủ đề đã học" value={topicsStudied} />
            <StatCard label="Yêu thích" value={favs} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Tìm từ vựng, cấu trúc, mẫu câu, chủ đề…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className={sel}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Chủ đề"
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} – {t.title_vi}
              </option>
            ))}
          </select>
          <select
            className={sel}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Trình độ"
          >
            <option value="">Mọi trình độ</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            className={sel}
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Loại học liệu"
          >
            <option value="">Mọi loại</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className={sel}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Trạng thái"
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Button
            variant={favOnly ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setFavOnly(!favOnly)}
          >
            <Star className="size-4" /> Tài liệu yêu thích
          </Button>
        </div>

        {selectedTopic && (
          <Card className="surface-card border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-sm">
                Đã học xong chủ đề <strong>{selectedTopic.title}</strong>? Hãy chuyển sang nói.
              </p>
              <PracticeBtn category={selectedTopic.practice_category} />
            </CardContent>
          </Card>
        )}

        {data.isPending ? (
          <p className="text-sm text-muted-foreground">Đang tải học liệu…</p>
        ) : data.error ? (
          <p className="text-sm text-destructive">Không tải được học liệu.</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có học liệu phù hợp.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((r) => (
              <ResourceCard
                key={r.id}
                r={r}
                p={pmap.get(r.id)}
                topic={topicName(r.topic_id)?.title ?? ""}
                category={topicName(r.topic_id)?.practice_category ?? null}
                onChange={(v) => setP.mutate({ resource_id: r.id, current: pmap.get(r.id), ...v })}
              />
            ))}
          </div>
        )}

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Nguồn tham khảo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              Nội dung do nhóm E2AI tự biên soạn cho học sinh THPT, tham khảo cách trình bày từ:
            </p>
            <ul className="list-disc pl-5">
              <li>
                <a
                  className="underline"
                  href="https://www.cambridgeenglish.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cambridge English
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://learnenglish.britishcouncil.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  British Council LearnEnglish
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://dictionary.cambridge.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cambridge Dictionary
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function PracticeBtn({ category }: { category: string | null }) {
  return (
    <Button asChild size="sm">
      <Link to="/luyen-tap" search={category ? { chude: category } : {}}>
        <Mic className="size-4" /> Thực hành với E2AI
      </Link>
    </Button>
  );
}

function ResourceCard({
  r,
  p,
  topic,
  category,
  onChange,
}: {
  r: Resource;
  p?: Progress | undefined;
  topic: string;
  category: string | null;
  onChange: (v: { favorite?: boolean; status?: LearnStatus }) => void;
}) {
  const st = (p?.status ?? "not_started") as LearnStatus;
  return (
    <Card className="surface-card">
      <CardContent className="space-y-2 pt-5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{TYPE_LABELS[r.resource_type as ResourceType]}</Badge>
            <Badge variant="outline">{r.level}</Badge>
            <Badge variant="outline">{topic}</Badge>
            {r.function_label && <Badge variant="outline">{r.function_label}</Badge>}
          </div>
          <button aria-label="Yêu thích" onClick={() => onChange({ favorite: !p?.favorite })}>
            <Star
              className={`size-5 ${p?.favorite ? "fill-warning text-warning" : "text-muted-foreground"}`}
            />
          </button>
        </div>
        <p className="text-base font-bold">
          {r.title}{" "}
          {r.part_of_speech && (
            <span className="font-normal italic text-muted-foreground">({r.part_of_speech})</span>
          )}
        </p>
        {r.meaning && (
          <p>
            <strong>Nghĩa:</strong> {r.meaning}
          </p>
        )}
        {r.notes && <p className="whitespace-pre-line text-muted-foreground">{r.notes}</p>}
        {r.example && (
          <p className="italic">
            {r.resource_type === "idea" ? "Ví dụ ngắn (đừng học thuộc): " : "Ví dụ: "}"{r.example}"
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(Object.keys(STATUS_LABELS) as LearnStatus[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={st === s ? "default" : "outline"}
              onClick={() => onChange({ status: s })}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
          <div className="ml-auto">
            <PracticeBtn category={category} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
