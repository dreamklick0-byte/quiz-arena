import { getSupabaseClient } from "@/lib/supabase";

export type TransactionType = 'deposit' | 'withdrawal' | 'stake' | 'win' | 'refund';

export async function getWalletBalance(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      // Auto-create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({ user_id: userId, balance: 0 })
        .select("balance")
        .single();
      
      if (createError) throw createError;
      return Number(newWallet.balance);
    }
    throw error;
  }
  return Number(data.balance);
}

export async function ensureWalletExists(userId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error && error.code === 'PGRST116') {
    await supabase.from("wallets").insert({ user_id: userId, balance: 0 });
  }
}

export async function processTransaction(
  userId: string,
  type: TransactionType,
  amount: number,
  reference: string,
  description: string
) {
  const supabase = getSupabaseClient();
  
  // 1. Create transaction record
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    reference,
    description,
    status: 'completed'
  });

  if (txError) throw txError;

  // 2. Update wallet balance
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance, total_won, total_spent")
    .eq("user_id", userId)
    .single();

  if (walletError) throw walletError;

  const currentBalance = Number(wallet.balance);
  let newBalance = currentBalance;
  let newTotalWon = Number(wallet.total_won);
  let newTotalSpent = Number(wallet.total_spent);

  if (type === 'deposit' || type === 'win' || type === 'refund') {
    newBalance += amount;
    if (type === 'win') newTotalWon += amount;
  } else if (type === 'withdrawal' || type === 'stake') {
    if (currentBalance < amount) throw new Error("Insufficient balance");
    newBalance -= amount;
    if (type === 'stake') newTotalSpent += amount;
  }

  const { error: updateError } = await supabase
    .from("wallets")
    .update({ 
      balance: newBalance,
      total_won: newTotalWon,
      total_spent: newTotalSpent,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;
}
