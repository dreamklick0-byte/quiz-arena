import { getSupabaseClient } from "@/lib/supabase"; 

export async function stakeOnServer(amount: number, reference: string, description: string) { 
  const { data } = await getSupabaseClient().auth.getSession(); 
  const token = data?.session?.access_token; 
  if (!token) throw new Error("Not logged in"); 
  const res = await fetch("/api/payment/stake", { 
    method: "POST", 
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
    body: JSON.stringify({ amount, reference, description }), 
  }); 
  const json = await res.json().catch(() => ({})); 
  if (!res.ok) throw new Error(json.error || "Stake failed"); 
} 
