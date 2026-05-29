import { NextResponse } from "next/server"; 
import { processTransaction } from "@/lib/wallet"; 

export async function POST(req: Request) { 
  try { 
    const { userId, amount, reference, description } = await req.json(); 
    if (!userId || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 }); 
    await processTransaction(userId, "stake", amount, reference, description); 
    return NextResponse.json({ success: true }); 
  } catch (err) { 
    return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
  } 
} 
