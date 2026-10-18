import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/e2ai/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoData } from "./TeacherBits";

type Table = "development_logs" | "prototype_tests";
export interface Field {
  key: string;
  label: string;
  required?: boolean;
  options?: string[];
}

/** Generic list + add form for the two research-team tables. */
export function RecordBoard({
  table,
  fields,
  orderBy,
}: {
  table: Table;
  fields: Field[];
  orderBy: string;
}) {
  const { isTeacher, user } = useAuth();
  const qc = useQueryClient();
  const key = ["e2ai", "board", table];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });
  const [form, setForm] = useState<Record<string, string>>({});

  const add = async () => {
    const missing = fields.find((f) => f.required && !form[f.key]?.trim());
    if (missing) {
      toast.error(`Vui lòng nhập "${missing.label}".`);
      return;
    }
    const row = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim()));
    const { error } = await supabase.from(table).insert({ ...row, created_by: user?.id } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu.");
    setForm({});
    qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-6">
      {isTeacher && (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Thêm mục mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>
                    {f.label}
                    {f.required && " *"}
                  </Label>
                  {f.options ? (
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    >
                      <option value="">—</option>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.key.endsWith("date") ? "date" : "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <Button onClick={add}>Lưu</Button>
          </CardContent>
        </Card>
      )}
      {q.isPending ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : !q.data?.length ? (
        <NoData />
      ) : (
        q.data.map((r) => (
          <Card key={String(r["id"])} className="surface-card">
            <CardContent className="space-y-1 pt-5 text-sm">
              {fields.map((f) =>
                r[f.key] ? (
                  <p key={f.key}>
                    <span className="text-muted-foreground">{f.label}: </span>
                    {String(r[f.key])}
                  </p>
                ) : null,
              )}
              {isTeacher && (
                <Button size="sm" variant="ghost" onClick={() => remove(String(r["id"]))}>
                  <Trash2 className="size-4" /> Xóa
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
