import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INTERACTION_MARKERS } from "@/lib/e2ai/scoring";

export const Route = createFileRoute("/gioi-thieu")({
  head: () => ({
    meta: [
      { title: "Giới thiệu E2AI – Nguyên mẫu nghiên cứu V1" },
      {
        name: "description",
        content:
          "Vấn đề nghiên cứu, giải pháp E2AI, chu trình hệ thống, công nghệ sử dụng và cách tính điểm nguyên mẫu minh bạch.",
      },
      { property: "og:title", content: "Giới thiệu E2AI V1" },
      {
        property: "og:description",
        content: "E2AI V1 là nguyên mẫu nghiên cứu học sinh với bộ quy tắc chấm điểm minh bạch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppLayout
      title="Giới thiệu E2AI"
      description="Student Engineering Research Prototype – Version 1.0"
    >
      <div className="space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Vấn đề nghiên cứu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              “Many students know English vocabulary and grammar but have difficulty responding
              quickly and developing a complete spoken response in real-time situations.”
            </p>
            <div>
              <p className="font-bold text-foreground">Giải pháp đề xuất</p>
              <p>
                “E2AI provides structured speaking/reflex practice, records measurable learning
                indicators, analyzes individual performance using transparent rules, and recommends
                the next practice activity.”
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">Chu trình hệ thống</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Input", "Practice", "Data", "Analysis", "Adaptation", "Progress"].map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-bold text-foreground">Công nghệ</p>
              <ul className="mt-1 list-disc pl-5">
                <li>Ứng dụng web (React + TanStack Start), responsive</li>
                <li>Lưu trữ dữ liệu theo từng mã học sinh trên thiết bị</li>
                <li>Chấm điểm bằng bộ quy tắc minh bạch (rule-based)</li>
                <li>Thuật toán đề xuất luyện tập thích ứng</li>
                <li>Trực quan hóa dữ liệu bằng biểu đồ</li>
                <li>Tạo và xuất báo cáo tiến trình cá nhân</li>
              </ul>
            </div>
            <p className="rounded-lg bg-primary-soft p-3 text-foreground">
              “V1 is a research prototype. Its scoring rules are designed for experimentation and
              are not a substitute for standardized English proficiency assessment.”
            </p>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>About scoring — thuật toán chấm điểm được công khai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <Block title="Fluency (1–5)">
              Dựa trên số từ trong câu trả lời: 0–4 từ → 1; 5–9 → 2; 10–19 → 3; 20–29 → 4; 30+ → 5.
              Nếu câu trả lời dài nhưng lặp từ nhiều (tỉ lệ từ khác nhau &lt; 45%), điểm bị giảm 1.
            </Block>
            <Block title="Vocabulary (1–5)">
              Đếm số từ khác nhau (không tính dấu câu): 0–3 → 1; 4–7 → 2; 8–14 → 3; 15–21 → 4; 22+ →
              5.
            </Block>
            <Block title="Grammar (1–5)">
              Đếm 6 dấu hiệu hoàn chỉnh của câu: có chủ ngữ, có động từ, có dấu kết thúc câu, có trợ
              động từ, có ít nhất 2 câu, viết hoa đầu câu. Một số lỗi cấu trúc rõ ràng (ví dụ “I
              is”) bị trừ điểm. Tổng dấu hiệu được quy đổi về thang 1–5. Đây là chỉ báo mức hoàn
              chỉnh của câu, không phải phân tích ngữ pháp chuyên sâu.
            </Block>
            <Block title="Interaction (1–5)">
              Đếm số từ nối / dấu hiệu tương tác xuất hiện trong câu trả lời:{" "}
              {INTERACTION_MARKERS.join(", ")} (và dấu hỏi). 0 → 1; 1 → 2; 2 → 3; 3 → 4; 4+ → 5.
            </Block>
            <Block title="Appropriateness (1–5)">
              So khớp từ khóa của tình huống với câu trả lời: 0 từ khóa → 1; 1 → 2; 2 → 3; 3 → 4; 4+
              → 5. Câu trả lời quá ngắn (&lt; 5 từ khác nhau) bị giới hạn ở 2 điểm; câu trả lời dài
              nhưng lệch từ khóa được cộng 1.
            </Block>
            <Block title="Overall & cấp độ">
              Overall = (Fluency + Vocabulary + Grammar + Interaction + Appropriateness) / 5, làm
              tròn 1 chữ số. 1.0–2.0 → Level 1 Basic; 2.1–3.0 → Level 2 Developing; 3.1–4.0 → Level
              3 Independent; 4.1–5.0 → Level 4 Confident. “Prototype practice level – not an
              official CEFR classification.”
            </Block>
            <Block title="Thuật toán thích ứng">
              R1: thời gian phản hồi TB &gt; 7 giây → Rapid Response Practice. R2: Vocabulary &lt; 3
              → Vocabulary Expansion. R3: Interaction &lt; 3 → Follow-up &amp; Interaction. R4:
              Fluency &lt; 3 → Extended Speaking. R5: Grammar &lt; 3 → Sentence Building. R6: 3
              phiên gần nhất ≥ 4.0 → tăng độ khó 1 bậc. R7: 2.5–4.0 → giữ độ khó. R8: phiên gần nhất
              &lt; 2.5 → lặp lại độ khó hiện tại với hỗ trợ thêm.
            </Block>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Tính trung thực trong nghiên cứu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Hệ thống phân biệt rõ 4 loại dữ liệu:</p>
            <ul className="list-disc pl-5">
              <li>
                <strong className="text-foreground">A. Dữ liệu đo tự động:</strong> thời gian phản
                hồi, số từ, thời điểm luyện tập.
              </li>
              <li>
                <strong className="text-foreground">B. Điểm nguyên mẫu theo quy tắc:</strong> 5 điểm
                kỹ năng và Overall (E2AI Prototype Score).
              </li>
              <li>
                <strong className="text-foreground">C. Thông tin học sinh tự nhập:</strong> hồ sơ và
                nội dung câu trả lời.
              </li>
              <li>
                <strong className="text-foreground">D. Phân tích AI (dự kiến V2):</strong> chưa có
                trong V1.
              </li>
            </ul>
            <p className="rounded-lg bg-muted p-3 text-foreground">
              “E2AI V1 uses transparent prototype indicators to monitor selected aspects of speaking
              practice.”
            </p>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Định hướng kiến trúc V2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              V1 không dùng bất kỳ API AI trả phí nào. Mã nguồn được tách lớp để V2 có thể bổ sung:
            </p>
            <ul className="list-disc pl-5">
              <li>
                Điểm mở rộng AI: trong <code>src/lib/e2ai/scoring.ts</code> — gửi câu trả lời tới
                một hàm phía máy chủ để nhận phân tích AI và hiển thị song song với điểm quy tắc.
              </li>
              <li>
                Lớp lưu trữ: trong <code>src/lib/e2ai/storage.ts</code> — thay các hàm đọc/ghi bằng
                cơ sở dữ liệu (students, practice_sessions, practice_tasks, scores, recommendations)
                kèm phân quyền theo từng học sinh.
              </li>
              <li>Speech-to-text, phân tích phát âm, phân tích ngữ nghĩa và ngữ pháp nâng cao.</li>
              <li>Bảng điều khiển cho giáo viên và thống kê ẩn danh theo lớp.</li>
            </ul>
            <p>Khóa API sẽ được lưu ở phía máy chủ, không bao giờ đặt trong mã nguồn giao diện.</p>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Quyền riêng tư dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Thông tin học sinh chỉ được sử dụng cho mục đích luyện tập và nghiên cứu giáo dục trong
            phạm vi dự án. Hệ thống không thu thập địa chỉ nhà, số điện thoại, email, mật khẩu, số
            giấy tờ tùy thân hay thông tin cá nhân nhạy cảm khác. Dữ liệu được lưu trên thiết bị của
            học sinh và tách riêng theo mã học sinh.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
