// lib/plan.ts
import { supabase } from "@/lib/supabase";

export type PlanStatus = {
  plan: "free" | "pro";
  status: "active" | "inactive" | "past_due" | "canceled" | string;
};

export async function getMyPlan(): Promise<PlanStatus> {
  const { data, error } = await supabase
    .from("user_plan")
    .select("plan,status")
    .maybeSingle();

  // kayıt yoksa free kabul
  if (error || !data) return { plan: "free", status: "inactive" };

  return {
    plan: (data.plan as any) ?? "free",
    status: data.status ?? "inactive",
  };
}

export function isProFromPlan(p: PlanStatus) {
  return p.plan === "pro" && p.status === "active";
}
