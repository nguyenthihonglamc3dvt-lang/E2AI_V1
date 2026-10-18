import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  FlaskConical,
  Home,
  Info,
  Menu,
  Mic,
  UserRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentStudent } from "@/lib/e2ai/storage";
import { AuthGate } from "./AuthGate";
import { signOut, useAuth } from "@/lib/e2ai/auth";
import { Award, LayoutDashboard, LibraryBig, LogOut, Users } from "lucide-react";

const NAV = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/ho-so", label: "Hồ sơ học sinh", icon: UserRound },
  { to: "/kiem-tra-dau-vao", label: "Kiểm tra đầu vào (Pre-test)", icon: ClipboardCheck },
  { to: "/kho-hoc-tap", label: "Kho học tập", icon: LibraryBig },
  { to: "/luyen-tap", label: "Luyện tập", icon: Mic },
  { to: "/danh-gia-cuoi-dot", label: "Đánh giá cuối đợt (Post-test)", icon: Award },
  { to: "/tien-trinh", label: "Tiến trình cá nhân", icon: BarChart3 },
  { to: "/bao-cao", label: "Báo cáo cá nhân", icon: FileText },
  { to: "/du-lieu-nghien-cuu", label: "Dữ liệu nghiên cứu", icon: Database },
  { to: "/gioi-thieu", label: "Giới thiệu E2AI", icon: Info },
] as const;

const TEAM_NAV = [
  { to: "/nhat-ky-phat-trien", label: "Nhật ký phát triển", icon: BookOpen },
  { to: "/kiem-thu", label: "Kiểm thử nguyên mẫu", icon: FlaskConical },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { isTeacher } = useAuth();
  const renderItem = (item: { to: string; label: string; icon: typeof Home }) => {
    const active = pathname === item.to;
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  if (isTeacher) {
    return (
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Teacher Admin
        </p>
        {renderItem({
          to: "/quan-tri",
          label: "Tổng quan & Báo cáo tổng hợp",
          icon: LayoutDashboard,
        })}
        {renderItem({ to: "/giao-vien", label: "Lớp học A01–A44", icon: Users })}
        {renderItem({ to: "/quan-tri/hoc-lieu", label: "Quản lý học liệu", icon: LibraryBig })}
        {renderItem({
          to: "/quan-tri/du-lieu",
          label: "Dữ liệu nghiên cứu (toàn bộ)",
          icon: Database,
        })}
        {renderItem({ to: "/gioi-thieu", label: "Giới thiệu E2AI", icon: Info })}
        <p className="mt-5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Nhóm nghiên cứu
        </p>
        {TEAM_NAV.map(renderItem)}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(renderItem)}
      <p className="mt-5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        Nhóm nghiên cứu
      </p>
      {TEAM_NAV.map(renderItem)}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight text-sidebar-foreground">E2AI V1</p>
        <p className="text-[11px] text-sidebar-foreground/70">Speaking Practice System</p>
      </div>
    </div>
  );
}

function CurrentStudentChip() {
  const { student, hydrated } = useCurrentStudent();
  const { isTeacher, user } = useAuth();
  if (!hydrated) return null;
  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/85">
      {isTeacher ? (
        <>
          <p className="font-semibold text-sidebar-foreground">Nguyễn Thị Hồng Lam</p>
          <p>Giáo viên · Tiếng Anh · THPT Đoàn Văn Tố</p>
        </>
      ) : student ? (
        <>
          <p className="font-semibold text-sidebar-foreground">{student.fullName}</p>
          <p className="mt-0.5 font-mono">{student.studentId}</p>
          <p>
            {student.className} · {student.school}
          </p>
          {student.isDemo && (
            <p className="mt-2 rounded bg-warning px-2 py-1 font-semibold text-warning-foreground">
              DEMO DATA – NOT REAL STUDENT DATA
            </p>
          )}
        </>
      ) : (
        <>
          <p className="font-semibold text-sidebar-foreground">Chưa có hồ sơ</p>
          <p className="mt-1">Vui lòng tạo hồ sơ học sinh để bắt đầu.</p>
        </>
      )}
      {user && (
        <button
          onClick={() => void signOut()}
          className="mt-2 flex items-center gap-1.5 font-semibold text-sidebar-foreground hover:underline"
        >
          <LogOut className="size-3.5" /> Đăng xuất
        </button>
      )}
    </div>
  );
}

export function AppLayout({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col justify-between overflow-y-auto bg-sidebar p-5 lg:flex">
          <div className="space-y-6">
            <Brand />
            <CurrentStudentChip />
            <NavLinks />
          </div>
          <p className="pt-6 text-[11px] leading-relaxed text-sidebar-foreground/60">
            Student Engineering Research Prototype – Version 1.0
          </p>
        </aside>

        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden no-print">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mở menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-80 overflow-y-auto bg-sidebar p-5">
              <SheetTitle className="sr-only">Điều hướng E2AI</SheetTitle>
              <div className="space-y-6">
                <Brand />
                <CurrentStudentChip />
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-semibold">E2AI V1</span>
          <span className="w-9" />
        </header>

        <main className="lg:pl-72">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
                {description && (
                  <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
