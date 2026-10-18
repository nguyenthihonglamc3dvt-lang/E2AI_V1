import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/e2ai/auth";
import { StudentHome } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Học sinh – E2AI V1" },
      { name: "description", content: "Bảng điều khiển học tập cá nhân E2AI V1." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isTeacher } = useAuth();

  useEffect(() => {
    if (isTeacher) {
      window.location.href = "/quan-tri";
    }
  }, [isTeacher]);

  if (isTeacher) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f8fafc]">
        <p className="text-sm font-semibold text-[#0f294a]">
          Đang chuyển hướng sang Dashboard Quản trị Giáo viên...
        </p>
      </div>
    );
  }

  return <StudentHome />;
}
