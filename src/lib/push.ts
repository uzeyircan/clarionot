import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  kind?: "forgotten_item" | "test";
  itemId?: string;
  tag?: string;
};

type WebSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushErrorWithStatus = {
  statusCode?: number;
};

function mustGetEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;

  webpush.setVapidDetails(
    mustGetEnv("WEB_PUSH_VAPID_SUBJECT"),
    mustGetEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY"),
    mustGetEnv("WEB_PUSH_VAPID_PRIVATE_KEY"),
  );

  vapidConfigured = true;
}

export function getPublicVapidKey() {
  return mustGetEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY");
}

export function createWebPushPayload(payload: PushPayload) {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard?view=forgotten",
    kind: payload.kind ?? "forgotten_item",
    itemId: payload.itemId ?? null,
    tag: payload.tag ?? "clarionot-reminder",
  });
}

export async function sendWebPush(
  subscription: WebSubscriptionRow,
  payload: PushPayload,
) {
  ensureVapid();

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    createWebPushPayload(payload),
  );
}

export function isExpiredPushSubscription(error: unknown) {
  const statusCode = (error as PushErrorWithStatus | null | undefined)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}
