import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { ResearchCardBoard } from "@/components/e2ai/ResearchCardBoard";

export const Route = createFileRoute("/nhat-ky-phat-trien")({
  head: () => ({
    meta: [
      { title: "Nhật ký phát triển – E2AI V1" },
      {
        name: "description",
        content:
          "Nhật ký phát triển nguyên mẫu E2AI dạng thẻ riêng biệt 8 trường dữ liệu tiêu chuẩn.",
      },
      { property: "og:title", content: "Nhật ký phát triển – E2AI V1" },
      {
        property: "og:description",
        content: "Ghi chép quá trình phát triển nguyên mẫu nghiên cứu E2AI dạng thẻ chuẩn hóa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout
      title="Nhật ký phát triển"
      description="Giao diện dạng thẻ riêng biệt (Cards/Blocks chuẩn 8 trường dữ liệu, không dùng bảng). Đồng bộ trực tiếp lên Supabase Cloud."
    >
      <ResearchCardBoard
        type="dev_log"
        title="Nhật ký tiến trình phát triển hệ thống E2AI V1"
        description="Lưu vết đầy đủ 8 trường tiêu chuẩn: TT, Ngày, Nội dung/Mã KT, Địa điểm, Người thực hiện, Minh chứng, Trạng thái PASS-FAIL, Xác nhận của GVHD."
        itemTypeLabel="Nhật ký phát triển"
      />
    </AppLayout>
  ),
});
