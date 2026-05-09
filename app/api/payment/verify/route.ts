import { NextResponse } from "next/server";
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
      const amount = data.data.amount / 100; // Convert kobo to naira

      // Use user_id from metadata passed during initialize
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
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
