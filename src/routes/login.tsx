import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getStoredSession, useAuth } from "@/lib/e2ai/auth";
import { GoogleAccountsSignContainer } from "@/components/e2ai/AuthGate";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập Google – E2AI V1" },
      {
        name: "description",
        content: "Đăng nhập Google Accounts nguyên bản cho Giáo viên và 44 Học sinh E2AI.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();

  // Kiểm tra ngay lập tức từ session lưu trữ đồng bộ
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      if (stored.role === "teacher") {
        window.location.href = "/quan-tri";
        return;
      }
      if (stored.role === "student" && stored.student_code) {
        window.location.href = "/dashboard";
        return;
      }
    }

    if (auth.signedIn) {
      if (auth.isTeacher || auth.role === "teacher") {
        window.location.href = "/quan-tri";
      } else if (auth.official || auth.role === "student") {
        window.location.href = "/dashboard";
      }
    }
  }, [auth.signedIn, auth.isTeacher, auth.role, auth.official]);

  const stored = getStoredSession();
  if (stored || (auth.signedIn && (auth.isTeacher || auth.official))) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f0f4f9]">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-[#1f1f1f]">Đang chuyển hướng vào Dashboard...</p>
        </div>
      </div>
    );
  }

  return <GoogleAccountsSignContainer />;
}
