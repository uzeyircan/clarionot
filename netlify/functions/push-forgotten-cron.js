exports.config = {
  schedule: "0 * * * *",
};

function getBaseUrl() {
  return (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    ""
  ).replace(/\/$/, "");
}

exports.handler = async function handler() {
  const baseUrl = getBaseUrl();
  const secret = process.env.PUSH_CRON_SECRET;

  if (!baseUrl) {
    throw new Error("Missing site URL for push scheduler.");
  }

  if (!secret) {
    throw new Error("Missing PUSH_CRON_SECRET for push scheduler.");
  }

  const response = await fetch(`${baseUrl}/api/push/send-forgotten`, {
    method: "POST",
    headers: {
      "x-cron-secret": secret,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Push scheduler failed (${response.status}): ${text}`);
  }

  return {
    statusCode: 200,
    body: text,
  };
};
