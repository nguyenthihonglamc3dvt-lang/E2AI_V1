import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Search,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  authenticateStudentSession,
  authenticateTeacherSession,
  ensureOfficialStudentsRoster,
  findStudentByEmail,
  getStoredSession,
  isTeacherEmail,
  signOut,
  useAuth,
  useAuthSync,
} from "@/lib/e2ai/auth";
import { syncLinkedStudent } from "@/lib/e2ai/cloud";
import { OFFICIAL_STUDENTS_LIST, OFFICIAL_TEACHER_INFO } from "@/lib/e2ai/content";

function GoogleWordmark() {
  return (
    <div className="flex items-center justify-center select-none py-1">
      <span className="text-2xl font-bold tracking-tight">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
      </span>
    </div>
  );
}

function GoogleIconG() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.36 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.005 10.04.005 12s.455 3.8 1.265 5.42l4.01-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  useAuthSync();
  const auth = useAuth();
  const synced = useRef<string | null>(null);

  useEffect(() => {
    void ensureOfficialStudentsRoster();
  }, []);

  useEffect(() => {
    if (!auth.user || !auth.official) return;
    if (synced.current === auth.user.id) return;
    synced.current = auth.user.id;
    void syncLinkedStudent(auth.user.id, auth.official, auth.profile?.learningGoal ?? null).catch(
      (e: Error) => console.warn(e.message),
    );
  }, [auth.user?.id, auth.official?.student_code]);

  // Kiểm tra session tức thì (đồng bộ và bất đồng bộ)
  const stored = getStoredSession();
  if (stored) {
    if (stored.role === "teacher") {
      return <>{children}</>;
    }
    if (stored.role === "student" && stored.student_code) {
      return <>{children}</>;
    }
  }

  // Khóa điều hướng: Ngay khi có session trong useAuth, cho phép truy cập ngay lập tức
  if (auth.isTeacher || auth.role === "teacher") {
    return <>{children}</>;
  }

  if (auth.official || auth.role === "student") {
    return <>{children}</>;
  }

  // Nếu người dùng đã đăng nhập Google nhưng chưa chọn mã học sinh trong 44 em (A01–A44)
  if (auth.signedIn && !auth.official) {
    return (
      <FirstTimeStudentModal
        email={auth.user?.email || "student@gmail.com"}
        onLinked={() => {
          window.location.href = "/dashboard";
        }}
      />
    );
  }

  // Chưa đăng nhập -> Hiển thị màn hình đăng nhập Google duy nhất
  return <GoogleAccountsSignContainer />;
}

export function GoogleAccountsSignContainer() {
  const [step, setStep] = useState<"initial" | "enter_email" | "pick_student">("initial");
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Xử lý khi nhấn nút chính "Continue with Google"
  const handleStartGoogle = () => {
    setStep("enter_email");
  };

  // Xử lý gửi Email
  const handleEmailSubmit = async (emailToProcess: string) => {
    const clean = emailToProcess.trim().toLowerCase();
    if (!clean) {
      toast.error("Vui lòng nhập địa chỉ email Google (Gmail).");
      return;
    }
    const fullEmail = clean.includes("@") ? clean : `${clean}@gmail.com`;
    setBusy(true);

    try {
      // TRƯỜNG HỢP 1: GIÁO VIÊN
      // Nếu Email chứa "doanvanto", "nthlam", "honglam", "nguyenthihonglam" hoặc đuôi ".edu" / ".edu.vn"
      if (isTeacherEmail(fullEmail)) {
        toast.success(
          "Xác thực Giáo viên thành công (Cô Nguyễn Thị Hồng Lam). Đang chuyển vào Dashboard Quản trị...",
        );
        await authenticateTeacherSession(fullEmail);
        // BẮT BUỘC DÙNG HARD REDIRECT
        window.location.href = "/quan-tri";
        return;
      }

      // TRƯỜNG HỢP 3: HỌC SINH TỪ LẦN 2 TRỞ ĐI
      // Tự động đối chiếu CSDL Supabase Cloud & LocalStorage, nhận diện Mã HS đã liên kết
      const existing = await findStudentByEmail(fullEmail);
      if (existing) {
        toast.success(
          `Nhận diện học sinh ${existing.student_code} – ${existing.full_name}! Đang vào Dashboard...`,
        );
        await authenticateStudentSession(existing.student_code, existing.full_name, fullEmail);
        // BẮT BUỘC DÙNG HARD REDIRECT VÀO DASHBOARD MÀ KHÔNG BẮT NHẬP LẠI MÃ
        window.location.href = "/dashboard";
        return;
      }

      // TRƯỜNG HỢP 2: HỌC SINH LẦN ĐẦU
      // Mở bảng nhập/chọn Mã HS (A01 đến A44)
      setEmailInput(fullEmail);
      setStep("pick_student");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4 py-8 font-sans">
      <div className="w-full max-w-md space-y-6 text-center p-6 sm:p-8 bg-card rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-border transition-all">
        {/* Logo Google chuẩn nguyên bản */}
        <div className="flex justify-center mb-1">
          <GoogleWordmark />
        </div>

        {/* 1. MÀN HÌNH ĐĂNG NHẬP CHÍNH (TIÊU ĐỀ SẠCH 100% - CHUẨN ANONYMOUS NCKH) */}
        {step === "initial" && (
          <div className="space-y-6 text-center">
            {/* TIÊU ĐỀ SẠCH 100% - CHUẨN ANONYMOUS NCKH */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Hệ thống E2AI V1
              </h1>
              <p className="text-muted-foreground text-sm">Hệ thống Luyện phản xạ nói tiếng Anh</p>
            </div>

            {/* GIỮ NGUYÊN NÚT ĐĂNG NHẬP HOẠT ĐỘNG BÌNH THƯỜNG */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleStartGoogle}
                className="w-full h-12 flex items-center justify-center gap-3 px-6 rounded-full border border-input bg-card hover:bg-muted text-foreground font-medium text-sm shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group"
              >
                <GoogleIconG />
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Continue with Google
                </span>
                <ChevronRight className="size-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* 2. BƯỚC NHẬP EMAIL GOOGLE (GMAIL) */}
        {step === "enter_email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleEmailSubmit(emailInput);
            }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-normal tracking-tight text-slate-800">
                Đăng nhập bằng Google
              </h1>
              <p className="text-sm text-slate-600">Nhập địa chỉ Gmail của bạn để tiếp tục</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type="text"
                  autoFocus
                  required
                  placeholder="Email hoặc số điện thoại (ví dụ: a42@gmail.com)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-12 px-3.5 text-base rounded-lg border-slate-300 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>

              {/* Các tài khoản gợi ý nhanh để kiểm thử và nghiên cứu */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Chọn nhanh tài khoản nghiên cứu:
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(OFFICIAL_TEACHER_INFO.email);
                      void handleEmailSubmit(OFFICIAL_TEACHER_INFO.email);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-[#0f294a] text-white text-[10px] font-bold grid place-items-center">
                        L
                      </div>
                      <span className="text-xs font-medium text-slate-800">
                        Cô Nguyễn Thị Hồng Lam
                      </span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                      Giáo viên
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const email = "phankhanhvy.a42@gmail.com";
                      setEmailInput(email);
                      void handleEmailSubmit(email);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-purple-600 text-white text-[10px] font-bold grid place-items-center">
                        V
                      </div>
                      <span className="text-xs font-medium text-slate-800">Phan Khánh Vy</span>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold">
                      A42 · Lớp 12A1
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const email = "quocanh.a01@gmail.com";
                      setEmailInput(email);
                      void handleEmailSubmit(email);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold grid place-items-center">
                        A
                      </div>
                      <span className="text-xs font-medium text-slate-800">Trần Quốc Anh</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                      A01 · Lớp 12A1
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("initial")}
                className="text-sm font-medium text-[#1a73e8] hover:bg-blue-50 px-3 py-2 rounded-md transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="size-4" /> Quay lại
              </button>
              <Button
                type="submit"
                disabled={busy}
                className="h-10 px-6 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-sm shadow-sm"
              >
                {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Tiếp tục
              </Button>
            </div>
          </form>
        )}

        {/* 3. BƯỚC HỌC SINH LẦN ĐẦU: CHỌN MÃ HS (A01 ĐẾN A44) */}
        {step === "pick_student" && (
          <StudentSelectionStep
            email={emailInput}
            onBack={() => setStep("enter_email")}
            onSuccess={() => {
              window.location.href = "/dashboard";
            }}
          />
        )}
      </div>

      {/* Footer chuẩn Google */}
      <div className="w-full max-w-[448px] mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
        <span>Tiếng Việt (Việt Nam)</span>
        <div className="flex gap-4">
          <span className="hover:text-slate-700 cursor-pointer">Trợ giúp</span>
          <span className="hover:text-slate-700 cursor-pointer">Bảo mật</span>
          <span className="hover:text-slate-700 cursor-pointer">Điều khoản</span>
        </div>
      </div>
    </div>
  );
}

function StudentSelectionStep({
  email,
  onBack,
  onSuccess,
}: {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<(typeof OFFICIAL_STUDENTS_LIST)[number] | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = OFFICIAL_STUDENTS_LIST.filter(
    (s) =>
      s.student_code.toLowerCase().includes(search.toLowerCase()) ||
      s.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleConfirm = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      // Lưu liên kết VĨNH VIỄN (Google Auth ID ↔ Mã HS ↔ Tên học sinh) lên Supabase Cloud
      await authenticateStudentSession(picked.student_code, picked.full_name, email);
      toast.success(
        `Đã liên kết vĩnh viễn Google Mail với học sinh ${picked.student_code} – ${picked.full_name}! Đang vào Dashboard...`,
      );
      // BẮT BUỘC DÙNG HARD REDIRECT
      window.location.href = "/dashboard";
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể liên kết học sinh.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          Chọn Mã học sinh (A01 đến A44)
        </h2>
        <p className="text-xs text-slate-500">
          Liên kết tài khoản Google: <b className="text-slate-800 font-mono">{email}</b>
        </p>
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
          Học sinh chọn đúng Mã số của mình. Hệ thống sẽ lưu liên kết vĩnh viễn và tự động nhận diện
          ở các lần đăng nhập tiếp theo.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
        <Input
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Gõ mã hoặc họ tên (ví dụ: A42, Phan Khánh Vy)..."
          className="pl-9 h-10 text-xs bg-slate-50 border-slate-300 rounded-md focus:border-[#1a73e8]"
        />
      </div>

      {picked ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#1a73e8] font-semibold text-xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Xác nhận thông tin học sinh:</span>
          </div>
          <div className="text-xs space-y-1 bg-white rounded-lg p-3 border border-slate-200 text-slate-800">
            <p>
              Mã học sinh: <b className="font-mono text-[#1a73e8] text-sm">{picked.student_code}</b>
            </p>
            <p>
              Họ và tên: <b className="text-slate-900">{picked.full_name}</b>
            </p>
            <p>
              Lớp: <b>{picked.class_name}</b> · Trường: <b>{picked.school}</b>
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 h-10 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-md shadow-sm"
              disabled={busy}
              onClick={handleConfirm}
            >
              {busy && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Xác nhận & Vào Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setPicked(null)}
              className="h-10 text-xs rounded-md"
            >
              Chọn lại
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Danh sách 44 học sinh Master ({filtered.length} kết quả)
          </p>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-200 rounded-lg p-1.5 bg-slate-50 divide-y divide-slate-100">
            {filtered.map((s) => (
              <button
                key={s.student_code}
                type="button"
                onClick={() => setPicked(s)}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1a73e8] w-8">{s.student_code}</span>
                  <span className="font-medium text-slate-900">{s.full_name}</span>
                </span>
                <span className="text-[11px] text-slate-500">Lớp {s.class_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#1a73e8] hover:underline font-medium"
        >
          ← Đổi email khác
        </button>
      </div>
    </div>
  );
}

function FirstTimeStudentModal({ email, onLinked }: { email: string; onLinked: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f0f4f9] p-4">
      <div className="w-full max-w-[448px] bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-200">
        <div className="flex justify-center mb-4">
          <GoogleWordmark />
        </div>
        <StudentSelectionStep email={email} onBack={() => signOut()} onSuccess={onLinked} />
      </div>
    </div>
  );
}
