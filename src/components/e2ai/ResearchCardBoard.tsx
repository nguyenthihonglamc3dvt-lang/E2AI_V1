import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  FileCheck,
  FolderGit2,
  MapPin,
  Plus,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/e2ai/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ResearchCardItem {
  id: string;
  tt: string;
  date: string;
  titleOrCode: string;
  location: string;
  performer: string;
  evidence: string;
  status: "PASS" | "FAIL" | "PENDING" | string;
  advisorConfirmation: string;
  // Optional extra details
  notes?: string;
}

interface ResearchCardBoardProps {
  type: "dev_log" | "prototype_test";
  title: string;
  description: string;
  itemTypeLabel: string;
}

export function ResearchCardBoard({
  type,
  title,
  description,
  itemTypeLabel,
}: ResearchCardBoardProps) {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const tableName = type === "dev_log" ? "development_logs" : "prototype_tests";
  const queryKey = ["e2ai", "research_cards", tableName];

  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for the 8 standard fields
  const [formTt, setFormTt] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTitleOrCode, setFormTitleOrCode] = useState("");
  const [formLocation, setFormLocation] = useState("Phòng Thực hành Tin học – THPT Đoàn Văn Tố");
  const [formPerformer, setFormPerformer] = useState(
    "Nhóm nghiên cứu E2AI (A42 - Phan Khánh Vy, A01 - Trần Quốc Anh)",
  );
  const [formEvidence, setFormEvidence] = useState("");
  const [formStatus, setFormStatus] = useState<"PASS" | "FAIL" | "PENDING">("PASS");
  const [formAdvisor, setFormAdvisor] = useState("GVHD: Cô Nguyễn Thị Hồng Lam (Đã nghiệm thu)");

  const { data: cards = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ResearchCardItem[]> => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn(`Error fetching ${tableName}:`, error);
      }
      const rawRows = (data ?? []) as Array<Record<string, unknown>>;
      return rawRows.map((r, idx) => {
        const fallbackTt = String(rawRows.length - idx).padStart(2, "0");
        if (type === "dev_log") {
          return {
            id: String(r["id"]),
            tt: String(r["tt"] || fallbackTt),
            date: String(r["entry_date"] || r["created_at"] || "").slice(0, 10),
            titleOrCode: String(r["title"] || "Chưa đặt tiêu đề"),
            location: String(r["location"] || "THPT Đoàn Văn Tố"),
            performer: String(r["author"] || "Nhóm nghiên cứu E2AI"),
            evidence: String(r["evidence"] || r["description"] || "Dữ liệu thực nghiệm nguyên mẫu"),
            status: String(r["status"] || "PASS").toUpperCase(),
            advisorConfirmation: String(
              r["advisor_confirmation"] || "GVHD: Cô Nguyễn Thị Hồng Lam (Đã duyệt)",
            ),
            notes: String(r["result"] || ""),
          };
        } else {
          return {
            id: String(r["id"]),
            tt: String(r["tt"] || fallbackTt),
            date: String(r["test_date"] || r["created_at"] || "").slice(0, 10),
            titleOrCode: String(
              r["test_code"]
                ? `${r["test_code"]}: ${r["test_case"] || ""}`
                : r["test_case"] || "Ca kiểm thử",
            ),
            location: String(r["location"] || "Phòng máy THPT Đoàn Văn Tố"),
            performer: String(r["tester"] || "Nhóm nghiên cứu E2AI"),
            evidence: String(r["evidence"] || r["actual_result"] || "Bản ghi âm .webm và logs"),
            status: String(r["status"] || "PASS").toUpperCase(),
            advisorConfirmation: String(
              r["advisor_confirmation"] || "GVHD: Cô Nguyễn Thị Hồng Lam (Đã kiểm tra đạt)",
            ),
            notes: String(r["notes"] || ""),
          };
        }
      });
    },
  });

  const handleOpenAddModal = () => {
    const nextTt = String(cards.length + 1).padStart(2, "0");
    setFormTt(nextTt);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTitleOrCode(
      type === "dev_log"
        ? `NK-${nextTt}: Cải tiến phản xạ nói tiếng Anh & Ghi âm giọng nói .webm`
        : `TC-${nextTt}: Kiểm thử chức năng đo thời gian phản hồi & Lưu trữ Supabase`,
    );
    setFormEvidence(
      type === "dev_log"
        ? "Bản ghi âm .webm, biểu đồ tiến trình cá nhân và dữ liệu 44 học sinh"
        : "Kết quả đối chứng thời gian phản xạ (ms) và file âm thanh thực tế",
    );
    setOpenModal(true);
  };

  const handleSaveCard = async () => {
    if (!formTitleOrCode.trim()) {
      toast.error("Vui lòng nhập Nội dung / Mã kiểm thử.");
      return;
    }
    setSubmitting(true);
    try {
      if (type === "dev_log") {
        const { error } = await supabase.from("development_logs").insert({
          tt: formTt,
          entry_date: formDate,
          title: formTitleOrCode.trim(),
          location: formLocation.trim(),
          author: formPerformer.trim(),
          evidence: formEvidence.trim(),
          status: formStatus,
          advisor_confirmation: formAdvisor.trim(),
          description: formEvidence.trim(),
          result: "Đạt mục tiêu nghiên cứu đề ra",
        } as never);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("prototype_tests").insert({
          tt: formTt,
          test_code: formTitleOrCode.split(":")[0]?.trim() || `TC-${formTt}`,
          test_case: formTitleOrCode.trim(),
          test_date: formDate,
          location: formLocation.trim(),
          tester: formPerformer.trim(),
          evidence: formEvidence.trim(),
          status: formStatus,
          advisor_confirmation: formAdvisor.trim(),
          test_category: "Thực nghiệm kiểm thử",
        } as never);
        if (error) throw error;
      }
      toast.success("Đã thêm thẻ mới và đồng bộ thành công lên Supabase Cloud!");
      setOpenModal(false);
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu thẻ mới.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (id: string, titleText: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thẻ "${titleText}"?`)) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      toast.success("Đã xóa thẻ khỏi hệ thống.");
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi xóa thẻ.");
    }
  };

  const passCount = cards.filter((c) => c.status === "PASS").length;
  const failCount = cards.filter((c) => c.status === "FAIL").length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {cards.length} thẻ
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="flex items-center gap-3 pt-1 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-3.5" /> {passCount} Đạt (PASS)
            </span>
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <XCircle className="size-3.5" /> {failCount} Cần xem xét (FAIL)
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={handleOpenAddModal}
          size="lg"
          className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
        >
          <Plus className="size-4" />
          <span>➕ Thêm mới</span>
        </Button>
      </div>

      {/* Cards Grid: Distinct Blocks (KHÔNG DÙNG BẢNG) */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Đang tải dữ liệu thẻ từ Supabase Cloud...
        </div>
      ) : cards.length === 0 ? (
        <Card className="surface-card border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">Chưa có thẻ nào được ghi nhận.</p>
          <Button onClick={handleOpenAddModal} variant="outline" className="gap-2">
            <Plus className="size-4" /> ➕ Thêm thẻ đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card) => {
            const isPass = card.status === "PASS";
            const isFail = card.status === "FAIL";

            return (
              <Card
                key={card.id}
                className="surface-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top Header of Card: TT, Date, Status */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary font-mono font-extrabold text-xs">
                        {card.tt}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Thứ tự {card.tt}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Calendar className="size-3.5" />
                        {card.date}
                      </span>
                      <Badge
                        className={
                          isPass
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            : isFail
                              ? "bg-rose-600 hover:bg-rose-700 text-white font-bold"
                              : "bg-amber-500 hover:bg-amber-600 text-white font-bold"
                        }
                      >
                        {card.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Main Content / Test Code */}
                  <div>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {card.titleOrCode}
                    </h3>
                  </div>

                  {/* 8 Standard Fields Grid in Card */}
                  <div className="space-y-2 text-xs bg-muted/30 rounded-xl p-3 border border-border/50">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Địa điểm: </span>
                        <span className="font-medium text-foreground">{card.location}</span>
                      </div>
                    </div>

                    {/* Performer */}
                    <div className="flex items-start gap-2">
                      <User className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Người thực hiện: </span>
                        <span className="font-medium text-foreground">{card.performer}</span>
                      </div>
                    </div>

                    {/* Evidence */}
                    <div className="flex items-start gap-2">
                      <FolderGit2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Minh chứng: </span>
                        <span className="font-medium text-foreground">{card.evidence}</span>
                      </div>
                    </div>

                    {/* Advisor Confirmation */}
                    <div className="flex items-start gap-2 pt-1 border-t border-border/40">
                      <FileCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Xác nhận GVHD: </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {card.advisorConfirmation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Corner: Delete Button (Red) */}
                <div className="px-5 py-3 bg-muted/15 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground italic">
                    {itemTypeLabel} • Đồng bộ Supabase
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id, card.titleOrCode)}
                    className="h-8 gap-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200 dark:border-rose-900/50 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Xóa</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form: Standard 8 Fields Form Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              ➕ Thêm thẻ mới – 8 trường tiêu chuẩn
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nhập đầy đủ 8 trường dữ liệu nghiên cứu tiêu chuẩn. Dữ liệu sẽ được lưu trực tiếp lên
              Supabase Cloud.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Field 1 & 2: TT and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">1. Thứ tự (TT) *</Label>
                <Input
                  value={formTt}
                  onChange={(e) => setFormTt(e.target.value)}
                  placeholder="01"
                  className="font-mono h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">2. Ngày thực hiện *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Field 3: Content / Test Code */}
            <div className="space-y-1">
              <Label className="text-xs">3. Nội dung / Mã kiểm thử *</Label>
              <Input
                value={formTitleOrCode}
                onChange={(e) => setFormTitleOrCode(e.target.value)}
                placeholder="Ví dụ: NK-04: Thử nghiệm ghi âm hoặc TC-04: Kiểm thử đồng bộ..."
                className="h-9 text-xs"
              />
            </div>

            {/* Field 4: Location */}
            <div className="space-y-1">
              <Label className="text-xs">4. Địa điểm thực hiện</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Phòng Thực hành Tin học – THPT Đoàn Văn Tố"
                className="h-9 text-xs"
              />
            </div>

            {/* Field 5: Performer */}
            <div className="space-y-1">
              <Label className="text-xs">5. Người thực hiện</Label>
              <Input
                value={formPerformer}
                onChange={(e) => setFormPerformer(e.target.value)}
                placeholder="Nhóm nghiên cứu E2AI (A42 - Phan Khánh Vy, A01 - Trần Quốc Anh)"
                className="h-9 text-xs"
              />
            </div>

            {/* Field 6: Evidence */}
            <div className="space-y-1">
              <Label className="text-xs">6. Minh chứng (Evidence / File / Logs)</Label>
              <Textarea
                rows={2}
                value={formEvidence}
                onChange={(e) => setFormEvidence(e.target.value)}
                placeholder="File ghi âm .webm, bảng điểm đối chứng, ảnh chụp nhật ký..."
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Field 7: Status */}
            <div className="space-y-1">
              <Label className="text-xs">7. Kết quả / Trạng thái PASS-FAIL</Label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as "PASS" | "FAIL" | "PENDING")}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="PASS">PASS – Đạt yêu cầu thực nghiệm</option>
                <option value="FAIL">FAIL – Chưa đạt / Cần hiệu chỉnh</option>
                <option value="PENDING">PENDING – Đang thử nghiệm bổ sung</option>
              </select>
            </div>

            {/* Field 8: Advisor Confirmation */}
            <div className="space-y-1">
              <Label className="text-xs">8. Xác nhận của người hướng dẫn (GVHD)</Label>
              <Input
                value={formAdvisor}
                onChange={(e) => setFormAdvisor(e.target.value)}
                placeholder="GVHD: Cô Nguyễn Thị Hồng Lam (Đã nghiệm thu)"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenModal(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleSaveCard}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? "Đang lưu..." : "Lưu vào Supabase Cloud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
