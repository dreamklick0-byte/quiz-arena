import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";
import { sendPushToAll, sendEmailToAll, sendWhatsAppToAll } from "@/lib/notifyChannels";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, url, channels } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    const supabase = getAdminClient();
    
    // Log admin action
    let adminId: string | null = null;
    try {
      const sessionData = JSON.parse(adminSession);
      adminId = sessionData.id || null;
    } catch {
      adminId = null;
    }
    await supabase.from("admin_logs").insert({
      admin_id: adminId,
      action: "SEND_CUSTOM_NOTIFICATION",
      details: `Title: ${title}, Body: ${body}, Channels: ${JSON.stringify(channels)}`,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    const tasks = [];
    if (channels.includes('push')) {
      tasks.push(sendPushToAll({ title, body, url: url || '/league' }));
    }
    if (channels.includes('email')) {
      tasks.push(sendEmailToAll({ subject: title, message: body, url: url || 'https://www.quizarena.com.ng' }));
    }
    if (channels.includes('whatsapp')) {
      tasks.push(sendWhatsAppToAll({ message: body, url: url || 'https://www.quizarena.com.ng' }));
    }

    const results = await Promise.allSettled(tasks);
    
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("Send notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
