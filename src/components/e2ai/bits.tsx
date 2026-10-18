import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Scores } from "@/lib/e2ai/types";
import { SKILL_LABELS } from "@/lib/e2ai/scoring";
import { useAuth } from "@/lib/e2ai/auth";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  tone?: "default" | "accent" | "primary";
}) {
  return (
    <Card className="surface-card gap-0 py-0">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1.5 text-2xl font-extrabold tabular-nums",
            tone === "accent" && "text-accent-foreground",
            tone === "primary" && "text-primary",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ScoreBars({ scores }: { scores: Scores }) {
  const entries = Object.entries(scores) as [keyof Scores, number][];
  return (
    <div className="space-y-2.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-44 shrink-0 text-xs text-muted-foreground sm:text-sm">
            {SKILL_LABELS[key]}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                value >= 4 ? "bg-accent" : value >= 3 ? "bg-primary" : "bg-warning",
              )}
              style={{ width: `${(value / 5) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function PrototypeNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      <strong>E2AI Prototype Score.</strong> Điểm số do bộ quy tắc minh bạch của V1 tạo ra, dùng để
      theo dõi luyện tập trong dự án nghiên cứu học sinh — không phải điểm đánh giá năng lực tiếng
      Anh chính thức và không phải phân loại CEFR.
    </p>
  );
}

export function NeedProfile() {
  const { isTeacher, official } = useAuth();
  if (isTeacher) {
    return (
      <Card className="surface-card">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <Badge variant="secondary">Tài khoản giáo viên</Badge>
          <p className="text-sm text-muted-foreground">
            Hồ sơ và dữ liệu của 44 học sinh được đọc trực tiếp từ cơ sở dữ liệu online tại trang
            Lớp học.
          </p>
          <Button asChild>
            <Link to="/giao-vien">Mở danh sách học sinh</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (official) {
    return (
      <Card className="surface-card">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <Badge variant="secondary">
            Đang tải hồ sơ {official.student_code} từ cơ sở dữ liệu online…
          </Badge>
          <p className="text-sm text-muted-foreground">
            Nếu thông báo này không biến mất, hãy tải lại trang.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="surface-card">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <Badge variant="secondary">Chưa liên kết hồ sơ học sinh</Badge>
        <p className="text-sm text-muted-foreground">
          Vui lòng đăng nhập Google và liên kết với mã học sinh.
        </p>
      </CardContent>
    </Card>
  );
}

export function EmptyData({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="mb-4 rounded-lg bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground">
      DEMO DATA – NOT REAL STUDENT DATA
    </div>
  );
}
