export const COIN_ECONOMY = { 
  PLATFORM_FEE_PERCENT: 0.20, 
  WITHDRAW_RATE: 0.80, 
  BATTLE_COIN_WITHDRAWAL_FEE: 0.25, 
  REWARD_COIN_WITHDRAWAL_FEE: 0, 
  MIN_WITHDRAWAL_COINS: 1000, 
 
   DAILY_SPIN_MIN: 0, 
   DAILY_SPIN_MAX: 2, 
   PRACTICE_REWARD: 0, 
   DAILY_GOAL_REWARD: 1, 
   WEEKLY_GOAL_REWARD: 5, 
   REFERRAL_BONUS: 10, 
   BATTLE_WIN_BONUS: 2, 
   DAILY_LOGIN_REWARD: 1, 

  PACKAGES: [ 
    { naira: 500, battleCoins: 500, bonus: 100, label: 'Starter Pack', popular: false }, 
    { naira: 1000, battleCoins: 1000, bonus: 250, label: 'Popular Pack', popular: true }, 
    { naira: 2000, battleCoins: 2000, bonus: 600, label: 'Value Pack', popular: false }, 
    { naira: 5000, battleCoins: 5000, bonus: 2000, label: 'Elite Pack', popular: false }, 
  ] 
 }; 
 
 export function calcCoinPrizePool(coinStakePerPlayer: number, playerCount: number): { 
   prizePool: number; 
   platformFee: number; 
 } { 
   const total = coinStakePerPlayer * playerCount; 
   const platformFee = Math.floor(total * COIN_ECONOMY.PLATFORM_FEE_PERCENT); 
   return { prizePool: total - platformFee, platformFee }; 
 } 
 
 export function calcBattleCoinWithdrawal(coins: number): { 
   fee: number; 
   netCoins: number; 
   naira: number; 
 } { 
   const fee = Math.floor(coins * COIN_ECONOMY.BATTLE_COIN_WITHDRAWAL_FEE); 
   const netCoins = coins - fee; 
   const naira = Math.floor(netCoins * COIN_ECONOMY.WITHDRAW_RATE); 
   return { fee, netCoins, naira }; 
 } 
 
 export function calcRewardCoinWithdrawal(coins: number): { 
   fee: number; 
   netCoins: number; 
   naira: number; 
 } { 
   const naira = Math.floor(coins * COIN_ECONOMY.WITHDRAW_RATE); 
   return { fee: 0, netCoins: coins, naira }; 
 } 
