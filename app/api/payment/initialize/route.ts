import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, amount, userId, referralCode } = await req.json();

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
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/verify?userId=${userId}`,
        metadata: {
          user_id: userId,
          referral_code: referralCode || null,
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
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}