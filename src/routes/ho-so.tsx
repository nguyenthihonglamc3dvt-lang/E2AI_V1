import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEARNING_GOALS } from "@/lib/e2ai/content";
import {
  deleteStudentData,
  setCurrentStudent,
  upsertStudent,
  useCurrentStudent,
} from "@/lib/e2ai/storage";
import type { LearningGoal } from "@/lib/e2ai/types";
import { saveProfile, useAuth } from "@/lib/e2ai/auth";

export const Route = createFileRoute("/ho-so")({
  head: () => ({
    meta: [
      { title: "Hồ sơ học sinh – E2AI V1" },
      {
        name: "description",
        content:
          "Tạo và chỉnh sửa hồ sơ học sinh E2AI: mã học sinh, họ tên, lớp, trường và mục tiêu học tập.",
      },
      { property: "og:title", content: "Hồ sơ học sinh – E2AI V1" },
      {
        property: "og:description",
        content: "Hồ sơ tối giản, chỉ thu thập thông tin cần thiết cho nguyên mẫu nghiên cứu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  studentId: z
    .string()
    .trim()
    .nonempty({ message: "Vui lòng nhập mã học sinh." })
    .max(24, { message: "Mã học sinh tối đa 24 ký tự." }),
  fullName: z
    .string()
    .trim()
    .nonempty({ message: "Vui lòng nhập họ và tên." })
    .max(80, { message: "Họ tên tối đa 80 ký tự." }),
  className: z.string().trim().nonempty({ message: "Vui lòng nhập lớp." }).max(30),
  school: z.string().trim().nonempty({ message: "Vui lòng nhập tên trường." }).max(120),
});

function ProfilePage() {
  const { db, student, hydrated } = useCurrentStudent();
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [school, setSchool] = useState("");
  const [goal, setGoal] = useState<LearningGoal>("General English improvement");
  const [lookupId, setLookupId] = useState("");
  const { official, user, isTeacher } = useAuth();
  const navigate = useNavigate();
  const locked = Boolean(official);

  useEffect(() => {
    if (student) {
      setStudentId(student.studentId);
      setFullName(student.fullName);
      setClassName(student.className);
      setSchool(student.school);
      setGoal(student.learningGoal);
    }
  }, [student?.studentId]);

  const save = () => {
    const parsed = schema.safeParse({ studentId, fullName, className, school });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    const existing = db.students.find((s) => s.studentId === parsed.data.studentId);
    try {
      upsertStudent({
        ...parsed.data,
        learningGoal: goal,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      if (official && user) {
        void saveProfile(user.id, {
          fullName: official.full_name,
          school: parsed.data.school,
          className: official.class_name ?? parsed.data.className,
          studentCode: official.student_code,
          learningGoal: goal,
        })
          .then(() => toast.success("Đã lưu hồ sơ lên cơ sở dữ liệu online."))
          .catch((e: Error) => toast.error("Chưa lưu được hồ sơ online: " + e.message));
      } else {
        toast.success(existing ? "Đã cập nhật hồ sơ học sinh." : "Đã tạo hồ sơ học sinh.");
      }
    } catch {
      toast.error("Không thể lưu hồ sơ trên thiết bị này.");
    }
  };

  const lookup = async () => {
    const id = lookupId.trim().toUpperCase();
    if (!id) {
      toast.error("Vui lòng nhập mã học sinh.");
      return;
    }
    if (isTeacher) {
      const { data, error } = await supabase
        .from("official_students")
        .select("student_code, full_name")
        .eq("student_code", id)
        .maybeSingle();
      if (error) {
        toast.error("Lỗi truy vấn cơ sở dữ liệu online: " + error.message);
        return;
      }
      if (!data) {
        toast.error(`Không có mã ${id} trong danh sách A01–A44.`);
        return;
      }
      toast.success(`${data.student_code} → ${data.full_name}`);
      void navigate({ to: "/giao-vien", search: { code: data.student_code } });
      return;
    }
    const found = db.students.find((s) => s.studentId.toLowerCase() === id.toLowerCase());
    if (!found) {
      toast.error("Không tìm thấy hồ sơ với mã học sinh này.");
      return;
    }
    setCurrentStudent(found.studentId);
    setLookupId("");
    toast.success(`Đã mở hồ sơ ${found.studentId}.`);
  };

  return (
    <AppLayout
      title="Hồ sơ học sinh"
      description="Mỗi học sinh có một mã riêng. Dữ liệu luyện tập được tách riêng theo mã học sinh."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Thông tin hồ sơ học sinh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="studentId">Mã học sinh (Student ID)</Label>
                <Input
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={locked}
                  placeholder="E2AI001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={locked}
                  placeholder="Nguyen Van An"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="className">Lớp</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="12A1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="school">Trường</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="THPT Đoàn Văn Tố"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mục tiêu học tập</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as LearningGoal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEARNING_GOALS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} size="lg">
              Lưu hồ sơ
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Thông tin học sinh chỉ được sử dụng cho mục đích luyện tập và nghiên cứu giáo dục
              trong phạm vi dự án. Hệ thống không thu thập địa chỉ, số điện thoại, email, mật khẩu
              hay số giấy tờ tùy thân.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {hydrated && student && (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle>Hồ sơ đang dùng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {student.isDemo && (
                  <Badge className="bg-warning text-warning-foreground">DEMO DATA</Badge>
                )}
                <Row label="Mã học sinh" value={student.studentId} />
                <Row label="Họ và tên" value={student.fullName} />
                <Row label="Lớp" value={student.className} />
                <Row label="Trường" value={student.school} />
                <Row label="Mục tiêu" value={student.learningGoal} />
                <Row
                  label="Ngày tạo"
                  value={new Date(student.createdAt).toLocaleDateString("vi-VN")}
                />
                {!locked && (
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setCurrentStudent(null)}
                  >
                    Đăng xuất hồ sơ
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="mt-2 ml-2"
                  onClick={() => {
                    deleteStudentData(student.studentId);
                    toast.success("Đã xóa hồ sơ và toàn bộ dữ liệu của học sinh này.");
                  }}
                >
                  Xóa hồ sơ &amp; dữ liệu
                </Button>
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle>Tra cứu hồ sơ bằng mã học sinh (A01–A44)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder={
                    isTeacher ? "Nhập mã học sinh, ví dụ A42" : "Nhập mã học sinh, ví dụ E2AI001"
                  }
                />
                <Button variant="secondary" onClick={lookup}>
                  Mở hồ sơ
                </Button>
                <p className="text-xs text-muted-foreground">
                  Danh sách hồ sơ trên thiết bị này:{" "}
                  {hydrated && db.students.length
                    ? db.students.map((s) => s.studentId).join(", ")
                    : "chưa có"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
