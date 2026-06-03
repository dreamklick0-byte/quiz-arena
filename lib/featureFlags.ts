// ============================================================
// QUIZ ARENA FEATURE FLAGS
// ============================================================
// Set a feature to TRUE to show it in the public navigation.
// Set it to FALSE to hide it from nav (but it still works via direct URL).
// To launch a new wave, just flip the flags to true and deploy.
// ============================================================

export const FEATURES = {
  // ✅ LIVE AT LAUNCH — June 7, 2026
  practice: true,
  battle: true,
  leaderboard: true,
  leagues: true,
  referral: true,
  rank: true,
  wallet: true,
  school_public: true,

  // 🔒 WAVE 2 — July 5, 2026
  spin: false,
  coins: false,
  players_online: false,
  missions: false,

  // 🔒 WAVE 3 — August 2, 2026
  hall_of_fame: false,
  certificates: false,
  school_dashboard: false,

  // 🔒 WAVE 4 — August 30, 2026
  state_leaderboards: false,
  streaks: false,
  notifications: false,

  // 🔒 WAVE 5 — September 27, 2026
  inter_school: false,
  season_pass: false,

  // 🔒 WAVE 6 — October 25, 2026
  national_tournament: false,
  parent_dashboard: false,
  school_ambassador: false,
};

// ============================================================
// SECRET PREVIEW MODE
// Set PREVIEW_MODE to true ONLY when testing unreleased features.
// Never commit with PREVIEW_MODE = true.
// ============================================================
export const PREVIEW_MODE = false;

// Your secret preview password — change this to something only you know
export const PREVIEW_PASSWORD = "quizarena-admin-preview-2026";
