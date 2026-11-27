import * as webpush from 'web-push';
import { Resend } from 'resend';
import { getAdminClient } from './supabase';

// Part B & E: Configure Push
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:dreamklick0@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPushToAll(payload: { title: string; body: string; url: string }) {
  const supabase = getAdminClient();
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');

  if (error || !subs) return { sent: 0, failed: 0, error: error?.message };

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        sent++;
      } catch (err: any) {
        failed++;
        // If status is 404 or 410, the subscription has expired or is no longer valid
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  return { sent, failed };
}

export async function sendEmailToAll(payload: { subject: string; message: string; url: string }) {
  if (!resend || !process.env.EMAIL_FROM) {
    return { skipped: true, reason: 'RESEND_API_KEY or EMAIL_FROM missing' };
  }

  const supabase = getAdminClient();
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;

  // Get all user emails via auth.admin.listUsers
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    if (error || !users || users.length === 0) break;
    allUsers = [...allUsers, ...users];
    if (users.length < perPage) break;
    page++;
  }

  // Filter by opt-in
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email_opt_in')
    .neq('email_opt_in', false);

  const optedInIds = new Set(profiles?.map(p => p.id) || []);
  const recipients = allUsers
    .filter(u => optedInIds.has(u.id))
    .map(u => u.email)
    .filter(Boolean) as string[];

  if (recipients.length === 0) return { sent: 0 };

  let sent = 0;
  // Send in batches of 50
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: batch,
        subject: payload.subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #7c3aed;">${payload.subject}</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.5;">${payload.message}</p>
            <div style="margin-top: 30px;">
              <a href="${payload.url}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open Quiz Arena</a>
            </div>
          </div>
        `
      });
      sent += batch.length;
    } catch (err) {
      console.error('Email batch error:', err);
    }
  }

  return { sent };
}

export async function sendWhatsAppToAll(payload: { message: string; url: string }) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    return { skipped: true, reason: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_ID missing' };
  }

  const supabase = getAdminClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('phone_is_whatsapp', true)
    .not('phone_number', 'is', null);

  // TODO: Implement Meta WhatsApp Cloud API sending.
  // Requires an approved Meta WhatsApp Cloud API template.
  // Do not call any external API yet.
  
  return { skipped: true, reason: 'STUB: WhatsApp implementation requires approved template', potentialRecipients: profiles?.length || 0 };
}
