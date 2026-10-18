import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/e2ai/AppLayout";
import { ResearchCardBoard } from "@/components/e2ai/ResearchCardBoard";

export const Route = createFileRoute("/kiem-thu")({
  head: () => ({
    meta: [
      { title: "Kiểm thử nguyên mẫu – E2AI V1" },
      {
        name: "description",
        content:
          "Kết quả kiểm thử nguyên mẫu E2AI dạng thẻ riêng biệt 8 trường dữ liệu tiêu chuẩn (không dùng bảng).",
      },
      { property: "og:title", content: "Kiểm thử nguyên mẫu – E2AI V1" },
      {
        property: "og:description",
        content: "Bảng ghi kết quả kiểm thử thực tế của nguyên mẫu E2AI dạng thẻ trực quan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout
      title="Kiểm thử nguyên mẫu"
      description="Giao diện dạng thẻ riêng biệt (Cards/Blocks chuẩn 8 trường dữ liệu, không dùng bảng). Đồng bộ trực tiếp lên Supabase Cloud."
    >
      <ResearchCardBoard
        type="prototype_test"
        title="Danh mục các ca kiểm thử nguyên mẫu E2AI V1"
        description="Lưu vết đầy đủ 8 trường tiêu chuẩn: TT, Ngày, Nội dung/Mã KT, Địa điểm, Người thực hiện, Minh chứng, Trạng thái PASS-FAIL, Xác nhận của GVHD."
        itemTypeLabel="Ca kiểm thử nguyên mẫu"
      />
    </AppLayout>
  ),
});
