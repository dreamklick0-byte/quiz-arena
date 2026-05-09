import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { email, amount, userId } = await req.json();
    
    // Paystack expects amount in kobo
    const amountInKobo = amount * 100;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet`,
        metadata: {
          user_id: userId,
          custom_fields: [
            {
              display_name: "Deposit Amount",
              variable_name: "deposit_amount",
              value: amount,
            },
          ],
        },
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ status: false, message: err.message }, { status: 500 });
  }
}
