import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// ✅ userId istemciden (body/query) hiçbir zaman kabul edilmez; kimlik
// yalnızca Authorization: Bearer <supabase access token> üzerinden,
// supabaseAdmin.auth.getUser() ile doğrulanmış oturumdan çıkarılır.
async function getUserFromAuthHeader(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1]?.trim();
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error) return null;

  return data.user ?? null;
}

// Bu, gerçek bir reauthentication değildir — yalnızca yanlışlıkla tıklamaya
// karşı bir doğrulama adımıdır. Silme yetkisi zaten doğrulanmış access
// token'dan gelir; e-posta eşleşmesi ek bir yetkilendirme katmanı sağlamaz.
function confirmationEmailMatches(
  confirmationEmail: unknown,
  authedEmail: string,
) {
  if (typeof confirmationEmail !== "string") return false;
  const trimmed = confirmationEmail.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() === authedEmail.toLowerCase();
}

// Yalnızca güvenli, dahili bir sınıflandırma kodu + işlem aşaması loglar.
// Ham error nesnesi, hata mesajı metni, e-posta, token, Stripe
// subscription/customer id ASLA burada loglanmaz.
function logSafeError(phase: string, e: unknown) {
  if (e instanceof Stripe.errors.StripeError) {
    console.error("account/delete", {
      phase,
      stripeErrorType: e.type,
      stripeErrorCode: e.code ?? "unknown",
    });
    return;
  }

  console.error("account/delete", { phase, errorKind: "unknown" });
}

// Stripe aboneliğini iptal eder. Dönüş: "canceled" (iptal edildi veya zaten
// iptaliydi, devam edilebilir) | "failed" (Stripe durumu doğrulanamadı veya
// iptal denemesi başarısız oldu, hesap SİLİNMEMELİ).
async function cancelActiveSubscriptionIfAny(
  stripe: Stripe,
  subscriptionId: string,
): Promise<"canceled" | "failed"> {
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (e) {
    // resource_missing: abonelik Stripe tarafında hiç yok — iptal edilecek
    // bir şey kalmamış demektir, idempotent no-op olarak devam edilebilir.
    if (
      e instanceof Stripe.errors.StripeInvalidRequestError &&
      e.code === "resource_missing"
    ) {
      return "canceled";
    }

    logSafeError("stripe_subscription_retrieve", e);
    return "failed";
  }

  // Zaten iptal edilmiş — aynı isteğin retry'ı veya webhook'un daha önce
  // işlediği bir durum. İkinci kez iptal denemek gereksiz bir Stripe
  // hatasına yol açar, bu yüzden burada no-op olarak geçiyoruz.
  if (subscription.status === "canceled") {
    return "canceled";
  }

  try {
    // ⚠️ Bilinçli olarak `cancel(id)` — period-end'de değil, ANINDA iptal.
    // `cancel_at_period_end` kullanılmıyor.
    await stripe.subscriptions.cancel(subscriptionId);
    return "canceled";
  } catch (e) {
    logSafeError("stripe_subscription_cancel", e);
    return "failed";
  }
}

export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);
  if (!user?.id) {
    return noStore({ error: "UNAUTHORIZED" }, 401);
  }

  const authedEmail = user.email;
  if (!authedEmail) {
    return noStore({ error: "EMAIL_NOT_AVAILABLE" }, 400);
  }

  const body = await req.json().catch(() => null);
  if (!confirmationEmailMatches(body?.confirmationEmail, authedEmail)) {
    return noStore({ error: "CONFIRMATION_EMAIL_MISMATCH" }, 400);
  }

  // 1) Aktif/hâlâ geçerli ücretli abonelik varsa hesap silinmeden önce
  //    Stripe'ta hemen iptal et. Free kullanıcıda provider_subscription_id
  //    boş olur ve bu adım hiç çalışmadan doğrudan Supabase silmeye geçilir.
  const { data: planRow, error: planErr } = await supabaseAdmin
    .from("user_plan")
    .select("provider_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (planErr) {
    console.error("account/delete", {
      phase: "user_plan_lookup",
      postgresErrorCode: planErr.code || "unknown",
    });
    return noStore({ error: "SERVER_ERROR" }, 500);
  }

  const subscriptionId = planRow?.provider_subscription_id ?? null;

  // "plan" kolonu burada kasıtlı olarak kullanılmıyor: plan=free, Stripe'ta
  // abonelik hâlâ iptal edilmemiş olsa bile oluşabilir (ör. past_due durumunda
  // current_period_end geçtiğinde uygulama erişimi kesilir ama Stripe
  // aboneliği Stripe tarafında otomatik olarak henüz iptal edilmemiş olabilir).
  // Bu yüzden "Stripe'a gitmeye gerek var mı" sorusu isProFromPlanRow() ile
  // değil, doğrudan webhook'un yazdığı `status` koluyla cevaplanır.
  //
  // Yerel `status` değerinin "canceled" olduğu KESİN bilinir çünkü bu değeri
  // yalnızca customer.subscription.deleted webhook'u yazar — yani Stripe
  // tarafında abonelik zaten sonlanmış demektir; provider_subscription_id
  // hâlâ dolu (stale) olsa bile tekrar Stripe'a gitmeye gerek yoktur.
  // Başka her status değerinde (active, trialing, past_due, unpaid,
  // incomplete, null veya bilinmeyen) güvenli tarafta kalınır ve Stripe
  // kontrol edilir.
  const subscriptionAlreadyCanceledLocally = planRow?.status === "canceled";

  if (subscriptionId && !subscriptionAlreadyCanceledLocally) {
    const stripe = getStripe();
    const result = await cancelActiveSubscriptionIfAny(stripe, subscriptionId);
    if (result === "failed") {
      // Stripe iptali doğrulanamadı/başarısız oldu — hesap KESİNLİKLE
      // silinmez. İstemciye ham Stripe hatası döndürülmez.
      return noStore({ error: "SUBSCRIPTION_CANCEL_FAILED" }, 502);
    }
  }

  // 2) Stripe adımı tamamlandıktan (veya hiç gerekmediğinden) sonra
  //    Supabase Auth kullanıcısını sil. Doğrulanmış production şemasında
  //    tüm kullanıcıya bağlı public tablolar auth.users(id) FK'sine
  //    ON DELETE CASCADE ile bağlı (items, groups, user_plan, user_settings,
  //    clip_tokens, clip_monthly_usage, device_push_subscriptions,
  //    notification_log) — bu yüzden burada ayrıca manuel public tablo
  //    silme YAPILMIYOR, tek doğruluk kaynağı auth.users silme işlemidir.
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(
    user.id,
  );

  if (deleteErr) {
    // Kullanıcı bu istekten önce zaten silinmişse (ör. aynı isteğin daha
    // önceki bir denemesi Stripe'ı iptal edip Auth silmeyi başarmış, ama
    // yanıt istemciye ulaşmadan bağlantı koptu ve istemci retry attıysa)
    // bunu başarı olarak ele al — idempotent retry.
    const alreadyDeleted =
      deleteErr.code === "user_not_found" || deleteErr.status === 404;

    if (!alreadyDeleted) {
      // ⚠️ Cross-system tam transaction yok: Stripe aboneliği burada zaten
      // iptal edilmiş olabilir ama Auth silme başarısız oldu. Bu durumda
      // başarı taklidi YAPILMAZ, genel bir hata dönülür. Retry güvenlidir:
      // aynı istek tekrar gönderilirse yukarıdaki "zaten iptal edilmiş"
      // kontrolü Stripe adımını no-op yapar ve doğrudan bu adıma geçilir.
      console.error("account/delete", {
        phase: "auth_delete_user",
        authErrorCode: deleteErr.code || "unknown",
        authErrorStatus: deleteErr.status ?? "unknown",
      });
      return noStore({ error: "ACCOUNT_DELETE_FAILED" }, 500);
    }
  }

  return noStore({ ok: true });
}
