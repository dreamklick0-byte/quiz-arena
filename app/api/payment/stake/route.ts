import { NextResponse } from "next/server"; 
import { processTransaction } from "@/lib/wallet"; 
import { getAdminClient } from "@/lib/supabase"; 

export async function POST(req: Request) { 
  try { 
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""); 
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
    const admin = getAdminClient(); 
    const { data: userData, error: authErr } = await admin.auth.getUser(token); 
    if (authErr || !userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 

    const { amount, reference, description } = await req.json(); 
    const amt = Number(amount); 
    if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 }); 

    await processTransaction(userData.user.id, "stake", amt, reference, description); 
    return NextResponse.json({ success: true }); 
  } catch (err) { 
    return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
  } 
} 
