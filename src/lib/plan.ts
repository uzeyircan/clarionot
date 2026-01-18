// lib/plan.ts
import { supabase } from "@/lib/supabase";

export type PlanStatus = {
  plan: "free" | "pro";
  status: string; // "active" | "canceling" | "past_due" | "canceled" | ...
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

export async function getMyPlan(): Promise<PlanStatus> {
  const { data, error } = await supabase
    .from("user_plan")
    .select("plan,status,current_period_end,cancel_at_period_end")
    .maybeSingle();

  if (error || !data) {
    return { plan: "free", status: "inactive" };
  }

  return {
    plan: (data.plan as any) ?? "free",
    status: data.status ?? "inactive",
    current_period_end: (data as any).current_period_end ?? null,
    cancel_at_period_end: (data as any).cancel_at_period_end ?? false,
  };
}

// Pro erişimi: past_due/canceled ise kapat.
// canceling ise dönem bitene kadar açık (önerilen doğru davranış)
export function isProFromPlan(p: PlanStatus) {
  if (p.plan !== "pro") return false;

  if (p.status === "active" || p.status === "trialing") return true;

  if (p.status === "canceling") {
    if (!p.current_period_end) return true;
    return new Date(p.current_period_end).getTime() > Date.now();
  }

  return false;
}
