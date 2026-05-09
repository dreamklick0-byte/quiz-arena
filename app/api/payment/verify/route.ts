import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { processTransaction } from "@/lib/wallet";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ status: false, message: "No reference provided" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.status && data.data.status === "success") {
      const supabase = getSupabaseClient();
      const amount = data.data.amount / 100; // Convert kobo to naira
      const email = data.data.customer.email;

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles") // Or wherever you store email mapping if not in profiles
        .select("id")
        .eq("email", email) // You might need to check auth.users if profiles doesn't have email
        .single();
      
      // Since I can't easily join auth.users from client-side supabase easily in some setups,
      // you might want to pass user_id in metadata during initialize.
      const userId = data.data.metadata.user_id;

      if (userId) {
        await processTransaction(
          userId,
          'deposit',
          amount,
          reference,
          `Wallet Deposit via Paystack`
        );
        return NextResponse.json({ status: true, message: "Payment verified and wallet updated" });
      }
    }

    return NextResponse.json({ status: false, message: "Payment verification failed" });
  } catch (err: any) {
    return NextResponse.json({ status: false, message: err.message }, { status: 500 });
  }
}
