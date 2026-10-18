import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/e2ai/auth";
import { STATUS_LABEL, type StudentStatus } from "@/lib/e2ai/teacher";

export function TeacherOnly({ children }: { children: ReactNode }) {
  const { isTeacher, loading } = useAuth();
  if (loading) return null;
  if (!isTeacher)
    return (
      <p className="text-sm text-muted-foreground">
        Trang này chỉ dành cho giáo viên (Teacher Admin).
      </p>
    );
  return <>{children}</>;
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  const cls =
    status === "completed"
      ? "bg-accent text-accent-foreground"
      : status === "in_progress"
        ? "bg-primary/15 text-primary"
        : "";
  return (
    <Badge
      variant={status === "unlinked" || status === "not_started" ? "outline" : "default"}
      className={cls}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function NoData({ text = "Chưa có dữ liệu" }: { text?: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
