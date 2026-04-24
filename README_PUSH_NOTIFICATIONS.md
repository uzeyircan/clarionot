# Push Notifications

This project now has a complete web push pipeline:

1. Browser permission is requested on authenticated app surfaces.
2. The active device subscription is stored in `device_push_subscriptions`.
3. Test pushes are sent from `/api/push/test`.
4. Forgotten-item pushes are sent from `/api/push/send-forgotten`.
5. Netlify runs `netlify/functions/push-forgotten-cron.js` every hour.

## Required environment variables

Add these in local `.env.local` and in your production environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_VAPID_SUBJECT=mailto:hello@clarionot.com

PUSH_CRON_SECRET=...
SITE_URL=https://your-domain.com
```

## Database

Run:

- `supabase/push-notifications.sql`

This creates:

- `device_push_subscriptions`
- `notification_log`
- push-related fields on `user_settings`

## Scheduler

Netlify scheduler is configured here:

- `netlify/functions/push-forgotten-cron.js`

It runs hourly and calls:

- `/api/push/send-forgotten`

The API route itself handles:

- daily vs weekly frequency
- quiet hours
- max notifications per day
- stale subscription cleanup for `404` / `410`

## Verification checklist

1. Open settings.
2. Connect the current device.
3. Send a test push.
4. Check that a row exists in `device_push_subscriptions`.
5. Deploy to Netlify.
6. Confirm the scheduled function appears in Netlify Functions.

## Manual trigger

You can manually hit the forgotten sender with:

```bash
curl -X POST https://your-domain.com/api/push/send-forgotten \
  -H "x-cron-secret: YOUR_PUSH_CRON_SECRET"
```

## Operational notes

- Expired subscriptions are auto-revoked when web push returns `404` or `410`.
- Failed forgotten sends are logged to `notification_log` with `status = 'failed'`.
- Notification click opens the dashboard with the related item focused.
