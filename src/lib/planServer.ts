// Sunucu route'ları (service-role) için tek, tutarlı Pro kontrolü.
// dashboard/page.tsx ve Header.tsx'teki client-side isPro mantığıyla
// aynı kuralı uygular: active/trialing DEĞİLSE bile current_period_end
// veya grace_until hâlâ gelecekteyse Pro erişimi kesilmez.

export type UserPlanRow = {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  grace_until?: string | null;
} | null;

export function isProFromPlanRow(row: UserPlanRow): boolean {
  if (!row || row.plan !== "pro") return false;

  const statusOk = row.status === "active" || row.status === "trialing";

  const stillValid =
    !!row.current_period_end &&
    new Date(row.current_period_end).getTime() > Date.now();

  const inGrace =
    !!row.grace_until && new Date(row.grace_until).getTime() > Date.now();

  return statusOk || stillValid || inGrace;
}
