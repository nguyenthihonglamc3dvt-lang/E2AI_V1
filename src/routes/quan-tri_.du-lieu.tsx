import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { StatusBadge, TeacherOnly } from "@/components/e2ai/TeacherBits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportResearchXlsx, useTeacherData } from "@/lib/e2ai/teacher";

export const Route = createFileRoute("/quan-tri_/du-lieu")({
  head: () => ({
    meta: [
      { title: "Teacher Admin – Dữ liệu nghiên cứu A01–A44 – E2AI V1" },
      {
        name: "description",
        content:
          "Bảng dữ liệu nghiên cứu toàn bộ 44 học sinh: practice, pre-test, post-test và trạng thái.",
      },
      { property: "og:title", content: "Dữ liệu nghiên cứu A01–A44 – E2AI V1" },
      { property: "og:description", content: "Giáo viên xem và xuất dữ liệu nghiên cứu toàn lớp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminData,
});

function AdminData() {
  const q = useTeacherData();
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const rows = (q.data ?? []).filter(
    (e) =>
      !t ||
      e.student.student_code.toLowerCase().includes(t) ||
      e.student.full_name.toLowerCase().includes(t),
  );
  return (
    <AppLayout
      title="Dữ liệu nghiên cứu – toàn bộ A01–A44"
      description="Chế độ Teacher Admin. Khác với trang Dữ liệu nghiên cứu của học sinh (chỉ dữ liệu cá nhân)."
      actions={
        <Button
          disabled={!q.data}
          onClick={() =>
            exportResearchXlsx(q.data ?? []).then(
              () => toast.success("Đã xuất Excel."),
              (e) => toast.error(String(e)),
            )
          }
        >
          <Download className="size-4" /> Xuất Excel
        </Button>
      }
    >
      <TeacherOnly>
        <Input
          className="mb-4 max-w-sm"
          placeholder="Tìm theo mã hoặc họ tên"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {q.isPending ? (
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu online…</p>
        ) : (
          <Card className="surface-card">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">STT</th>
                    <th className="px-3 py-2">Mã NC</th>
                    <th className="px-3 py-2">Họ tên</th>
                    <th className="px-3 py-2">Lớp</th>
                    <th className="px-3 py-2 text-right">Practice</th>
                    <th className="px-3 py-2">Pre</th>
                    <th className="px-3 py-2">Post</th>
                    <th className="px-3 py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((e, i) => (
                    <tr key={e.student.student_code} className="hover:bg-muted/50">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-mono font-semibold">
                        <Link
                          to="/quan-tri/hoc-sinh/$code"
                          params={{ code: e.student.student_code }}
                          className="text-primary hover:underline"
                        >
                          {e.student.student_code}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{e.student.full_name}</td>
                      <td className="px-3 py-2">{e.student.class_name ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.practice.length}</td>
                      <td className="px-3 py-2">
                        {e.pre.length ? `Có (${e.pre.length})` : "Chưa"}
                      </td>
                      <td className="px-3 py-2">
                        {e.post.length ? `Có (${e.post.length})` : "Chưa"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </TeacherOnly>
    </AppLayout>
  );
}
