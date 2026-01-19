import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function sendPaymentFailedEmail(args: {
  to: string;
  manageUrl?: string | null;
}) {
  const from = mustGetEnv("EMAIL_FROM");

  await resend.emails.send({
    from,
    to: args.to,
    subject: "Ödeme alınamadı – Kartını güncelle",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>Ödeme alınamadı</h2>
        <p>Kartından ödeme alınamadı. Pro erişiminin kesintiye uğramaması için kart bilgini güncelle.</p>

        ${
          args.manageUrl
            ? `<p>
                <a href="${args.manageUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
                  Kartı Güncelle
                </a>
              </p>`
            : ""
        }

        <p style="color:#666;font-size:12px">Bu mail otomatik gönderilmiştir.</p>
      </div>
    `,
  });
}

export async function sendPaymentSucceededEmail(args: {
  to: string;
  manageUrl?: string | null;
}) {
  const from = mustGetEnv("EMAIL_FROM");

  await resend.emails.send({
    from,
    to: args.to,
    subject: "Ödeme alındı – Pro aktif",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>Ödeme alındı ✅</h2>
        <p>Ödemen başarıyla alındı. Pro erişimin devam ediyor.</p>

        ${
          args.manageUrl
            ? `<p>
                <a href="${args.manageUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
                  Faturalandırmayı Yönet
                </a>
              </p>`
            : ""
        }

        <p style="color:#666;font-size:12px">Bu mail otomatik gönderilmiştir.</p>
      </div>
    `,
  });
}
