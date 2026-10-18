import { createFileRoute } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/e2ai/AppLayout";
import {
  DemoBanner,
  EmptyData,
  NeedProfile,
  PrototypeNotice,
  StatCard,
} from "@/components/e2ai/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearSessions, useCurrentStudent } from "@/lib/e2ai/storage";
import { exportSessionsCsv, exportSessionsJson, SESSION_CSV_HEADERS } from "@/lib/e2ai/exporters";
import { clearDemoData, isDemoActive, seedDemoData } from "@/lib/e2ai/demo";

export const Route = createFileRoute("/du-lieu-nghien-cuu")({
  head: () => ({
    meta: [
      { title: "Dữ liệu nghiên cứu – E2AI V1" },
      {
        name: "description",
        content:
          "Xuất dữ liệu luyện tập cá nhân dưới dạng CSV hoặc JSON để phục vụ phân tích trong dự án nghiên cứu học sinh.",
      },
      { property: "og:title", content: "Dữ liệu nghiên cứu – E2AI V1" },
      {
        property: "og:description",
        content: "Mỗi học sinh chỉ xuất được dữ liệu của chính mình.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchDataPage,
});

function ResearchDataPage() {
  const { student, sessions, hydrated } = useCurrentStudent();

  if (!hydrated) return <AppLayout title="Dữ liệu nghiên cứu">{null}</AppLayout>;
  if (!student)
    return (
      <AppLayout title="Dữ liệu nghiên cứu" description="Xuất dữ liệu luyện tập của chính bạn.">
        <NeedProfile />
      </AppLayout>
    );

  const safe = (fn: () => void) => {
    try {
      fn();
      toast.success("Đã tạo tệp xuất dữ liệu.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể xuất dữ liệu.");
    }
  };

  return (
    <AppLayout
      title="Dữ liệu nghiên cứu"
      description="Bạn chỉ có thể xem và xuất dữ liệu của mã học sinh đang đăng nhập. Dữ liệu của học sinh khác không được truy cập."
    >
      {student.isDemo && <DemoBanner />}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Mã học sinh" value={student.studentId} />
          <StatCard label="Số bản ghi" value={sessions.length} />
          <StatCard
            label="Bản ghi gần nhất"
            value={sessions[0] ? new Date(sessions[0].createdAt).toLocaleDateString("vi-VN") : "—"}
          />
        </div>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Xuất dữ liệu cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.length === 0 ? (
              <EmptyData message="Chưa có dữ liệu phiên luyện tập để xuất." />
            ) : (
              <p className="text-sm text-muted-foreground">
                Tệp CSV gồm các cột: {SESSION_CSV_HEADERS.join(" · ")}. Tệp JSON chứa cùng thông tin
                ở dạng có cấu trúc, kèm nội dung câu trả lời và đề xuất thích ứng.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => safe(() => exportSessionsCsv(student, sessions))}>
                <Download className="size-4" /> Xuất CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => safe(() => exportSessionsJson(student, sessions))}
              >
                <Download className="size-4" /> Xuất JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (sessions.length === 0) {
                    toast.error("Không có dữ liệu để xóa.");
                    return;
                  }
                  clearSessions(student.studentId);
                  toast.success("Đã xóa toàn bộ phiên luyện tập của bạn.");
                }}
              >
                <Trash2 className="size-4" /> Xóa dữ liệu luyện tập của tôi
              </Button>
            </div>
            <PrototypeNotice />
          </CardContent>
        </Card>

        <Card className="surface-card border-warning/50">
          <CardHeader>
            <CardTitle>DEMO MODE (dành cho nhóm nghiên cứu)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Chế độ demo tạo một hồ sơ riêng mang nhãn{" "}
              <strong>DEMO DATA – NOT REAL STUDENT DATA</strong> với mã <code>E2AI-DEMO</code>. Dữ
              liệu demo không bao giờ được trộn vào dữ liệu thật của học sinh.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  seedDemoData();
                  toast.success("Đã bật DEMO MODE và chuyển sang hồ sơ demo.");
                }}
              >
                Bật dữ liệu demo
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!isDemoActive()) {
                    toast.error("Hiện không có dữ liệu demo nào.");
                    return;
                  }
                  clearDemoData();
                  toast.success("Đã xóa dữ liệu demo.");
                }}
              >
                <Trash2 className="size-4" /> Xóa dữ liệu demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
