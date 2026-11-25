# Quiz Arena — Comprehensive Project Document

**Document date:** November 20, 2026  
**Workspace:** `C:\xampp\htdocs\quiz-arena`  
**Repository:** `dreamklick0-byte/quiz-arena`  
**Remote:** `https://github.com/dreamklick0-byte/quiz-arena.git`

## 1. Executive Summary

Quiz Arena is a Next.js quiz and competition platform for JAMB, WAEC, NECO, and related academic subjects. It combines practice quizzes, real-time or near-real-time battle rooms, leagues, rewards, wallets, coin staking, referrals, rank progression, daily spins, school dashboards, and platform administration.

The application is a Next.js 16 App Router project using React 19, Tailwind CSS 4, Supabase for authentication and database/realtime/storage capabilities, Paystack for cash payments, and Vercel for deployment. It contains 37 page routes and 45 API route handlers.

## 2. Technology Stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.2.4, App Router |
| UI | React 19.2.4, Tailwind CSS 4 |
| Language | TypeScript 5, strict mode enabled |
| State | React state/hooks, Zustand (`gamificationStore`) |
| Animation | Framer Motion, canvas-confetti |
| Backend services | Next.js route handlers |
| Database/Auth/Realtime/Storage | Supabase (`@supabase/supabase-js`) |
| Payments | Paystack Inline JS and Paystack API |
| Password hashing | bcryptjs |
| CSV import | csv-parse and custom import scripts |
| Deployment | Vercel |
| Scheduled tasks | Vercel Cron |
| Icons | Lucide React |

## 3. Repository and Runtime Layout

```text
quiz-arena/
├── app/                         # Pages, components, API routes, data
├── components/                  # Shared BattleRequestListener and SiteHeader
├── lib/                         # Supabase, wallet, rank, battle, coin, mission, and RPC helpers
├── scripts/                     # Super-admin setup utilities
├── public/                      # Not present in the current workspace
├── middleware.ts                # Protects admin and school dashboard routes
├── next.config.ts               # Next.js configuration
├── vercel.json                  # Cron configuration
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # TypeScript configuration and @/* alias
├── .env.local                   # Local environment secrets/configuration
├── .env.example                 # Example environment names
├── .gitignore                   # Ignored/generated files
├── node_modules/                # Locally installed dependencies
├── .next/                       # Local build/cache output
└── PROJECT_COMPREHENSIVE_DOCUMENT.md
```

The `app/` directory follows the Next.js App Router convention. There is a legacy/duplicate component folder at `components/`, while most application components are under `app/components/`.

## 4. Application Architecture

### 4.1 Frontend

The `app/layout.tsx` root layout provides:

- Global styles.
- Geist Sans and Geist Mono fonts.
- Metadata and Open Graph/Twitter metadata.
- The global `SiteHeader`.
- A global `BattleRequestListener` for incoming battle requests.

Most content pages are client components that access Supabase directly using browser clients. Server-side route handlers use the Supabase service-role client for privileged operations.

### 4.2 Supabase Connectivity

`lib/supabase.ts` creates cached Supabase clients:

- Public browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin/service client using `SUPABASE_SERVICE_ROLE_KEY`, restricted to server-side use.
- A compatibility-style `supabase` export for `.from()`, `.auth`, `.channel()`, `.rpc()`, and realtime operations.

The application depends heavily on hosted Supabase:

- Supabase Auth for user identity.
- Supabase Postgres tables for application state.
- Supabase Realtime channels for battle and matchmaking updates.
- Supabase Storage for the school logo upload in the public storage bucket.

### 4.3 Authentication and Sessions

Student authentication is based on Supabase Auth. Several pages call `supabase.auth.getUser()` and create or update profile/wallet records.

Platform admins use a custom `admin_session` cookie. Middleware prevents unauthenticated access to `/admin/*`, except `/admin/login`. School dashboards use a custom `school_session` cookie and middleware protects `/school/dashboard/*`.

### 4.4 Middleware

`middleware.ts` redirects:

- Unauthenticated `/admin/*` users to `/admin/login`.
- Unauthenticated `/school/dashboard/*` users to `/school/login`.

## 5. Main User Features

### 5.1 Landing Page

The landing page markets the platform and presents:

- A promotional hero and subject links.
- Feature cards.
- A live-style activity ticker.
- Testimonials.
- Subject categories.
- Competition and referral calls to action.
- A Hall of Fame widget.

Its images are mostly externally hosted on Unsplash. No local image assets directory is present.

### 5.2 Authentication

`/auth` supports sign-in and account creation flows. New users receive or are associated with:

- A profile record.
- A wallet record.
- Optional referral information.
- A rank record through application/database defaults or RPC behavior.

### 5.3 Practice Quizzes

`/practice` shows supported subjects:

- Maths
- English
- Physics
- Chemistry
- Biology
- Government
- Economics
- Agricultural Science
- Current Affairs

The subject route loads practice questions from Supabase or local practice data. There are exam-type routes such as `/practice/[subject]/[examType]`. Practice records, XP rewards, streaks, and completion progress are represented by the relevant Supabase tables and client code.

A CSV import file named `physics_import_final.csv` is available. Import utilities exist under `scripts/`, root scripts, and `/admin/import`.

### 5.4 Live Battles

`/battle` is the battle lobby. Users can:

- Create private rooms.
- Join rooms by six-character code.
- Use quick matchmaking.
- Select a subject.
- Set player limits of 2, 3, or 4.
- Play free challenges or stake coins.
- Preview room state and player count.

Battle room pages cover:

- `/battle/[roomCode]` — waiting room.
- `/battle/[roomCode]/play` — live quiz gameplay.
- `/battle/[roomCode]/results` — result, XP, rematch, and prize handling.

Core battle tables include:

- `battle_rooms`
- `room_players`
- `battle_answers`
- `battle_requests`
- `matchmaking_queue`

Battle functionality includes realtime presence/update subscriptions, answers, scores, rematches, XP awards, and prize distribution.

### 5.5 Wallet and Coins

`/account/wallet` handles wallet and payment-facing actions. `/coins` provides battle/reward coin balances and coin history.

The coin economy defines:

- 20% platform fee on battle coin prize pools.
- 80% withdrawal conversion rate.
- 25% fee on battle coin withdrawals.
- No fee on reward coin withdrawals.
- Minimum withdrawal of 1,000 coins.
- Coin purchase packages: ₦500, ₦1,000, ₦2,000, and ₦5,000.

Cash wallet features include deposits, stakes, winnings, refunds, withdrawal requests, and transaction history.

### 5.6 Daily Spin

`/spin` provides the daily wheel experience. Two implementations/API routes exist:

- `/api/spin`
- `/api/spin-wheel`, `/api/spin-wheel/segments`, and `/api/spin-wheel/claim`

Features include:

- Daily spin restrictions.
- Testing mode.
- Wheel segments.
- Wallet and XP rewards.
- Spin attempt tracking.
- Signed or secret-based claim handling in the claim route.

### 5.7 Leagues

`/league` lists available leagues and handles joining and registration. Dynamic pages cover:

- `/league/[id]/play`
- `/league/[id]/results`

League features include:

- League entry records.
- Score and completion-time ranking.
- Start and distribution APIs.
- Scheduled league checks.
- Prize/result handling.

### 5.8 Missions and Streaks

`/missions` contains mission progress and claims. It uses `missions` and `user_missions`. The coin economy defines daily, weekly, and referral rewards.

Streak and notification components read/update `user_streaks`, `profiles`, and notification records.

### 5.9 Rank and Gamification

`/rank` displays rank progression. `lib/rankSystem.ts` defines 20 ranks from “Rookie Mind” to “Grand Quiz Emperor,” with XP thresholds from 0 to 10,000,000.

XP rewards include:

- Battle win: 50 XP.
- Battle loss: 10 XP.
- Practice completion: 5 XP.
- Daily login: 20 XP.
- League join: 20 XP.
- Referral: 100 XP.

Zustand is used for UI gamification state and notifications.

### 5.10 Leaderboards and Hall of Fame

`/leaderboard` ranks users based on subject wins and rank data.

`/hall-of-fame` reads hall-of-fame records and includes a reusable homepage widget.

`/players` provides the player and presence-facing experience.

### 5.11 Referrals

`/referral` tracks referral codes and earnings. API routes apply referrals and process bonuses.

Relevant tables include:

- `profiles`
- `referrals`
- `referral_earnings`

### 5.12 Certificates

`/certificate` provides an account-facing certificate view or generated achievement outcome.

### 5.13 Schools

`/school` allows students or admins to register/join schools.

`/school/login` handles school administrator authentication.

`/school/dashboard` contains:

- School profile and logo management.
- Student lists.
- Student rank and wins.
- Battle and answer data.
- Subject performance metrics.
- Student removal.
- Admin-protected sessions.

The dashboard uploads a school logo to Supabase Storage bucket `public` and stores the public URL in `schools.logo_url`.

### 5.14 Platform Administration

The admin system includes:

- `/admin` dashboard and online-user statistics.
- `/admin/login` authentication.
- `/admin/users` user management and detailed user statistics.
- `/admin/questions` question CRUD.
- `/admin/import` bulk question import.
- `/admin/leagues` league management.
- `/admin/withdrawals` withdrawal approval/rejection.
- `/admin/activity-logs` activity audit logs.
- `/admin/settings` platform settings and notifications.
- `/admin/manage-admins` administrator management.

Administrative API routes cover authentication, sessions, password changes, user creation, admin creation/deactivation, question management, imports, league management, withdrawal processing, platform statistics, logs, and feature flags.

## 6. Page Route Inventory

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/auth` | Sign in/sign up |
| `/account` | User account and gamification information |
| `/account/wallet` | Wallet, deposits, and withdrawals |
| `/coins` | Battle/reward coin management |
| `/practice` | Subject selection |
| `/practice/[subject]` | Subject practice |
| `/practice/[subject]/[examType]` | Exam-specific quiz |
| `/battle` | Battle lobby |
| `/battle/[roomCode]` | Waiting room |
| `/battle/[roomCode]/play` | Battle gameplay |
| `/battle/[roomCode]/results` | Battle results/rematch |
| `/league` | League listing |
| `/league/[id]/play` | League quiz |
| `/league/[id]/results` | League ranking/results |
| `/spin` | Daily spin wheel |
| `/missions` | Missions |
| `/rank` | Rank progression |
| `/leaderboard` | Ranking leaderboard |
| `/hall-of-fame` | Hall of fame |
| `/players` | Player/presence area |
| `/referral` | Referrals |
| `/certificate` | Certificate view |
| `/school` | School registration/joining |
| `/school/login` | School login |
| `/school/dashboard` | School dashboard |
| `/preview` | Preview route |
| `/admin` | Admin dashboard |
| `/admin/login` | Admin login |
| `/admin/users` | User administration |
| `/admin/questions` | Question administration |
| `/admin/import` | Question imports |
| `/admin/leagues` | League administration |
| `/admin/withdrawals` | Withdrawal processing |
| `/admin/activity-logs` | Audit logs |
| `/admin/settings` | Platform settings |
| `/admin/manage-admins` | Admin account management |

## 7. API Route Inventory

### 7.1 Admin

- Authentication: `/api/admin/auth`, `/api/admin/logout`, `/api/admin/me`
- Account operations: change password, reset password, create/update/deactivate admins
- User operations: create user, list users, user profile/action
- Questions: list, get/create/update/delete operations
- Leagues: admin league CRUD/list
- Withdrawals: list and process
- Logs and statistics: list logs and platform stats
- Feature flags and settings support

### 7.2 Payments and Wallet

- `/api/payment/initialize`
- `/api/payment/verify`
- `/api/payment/stake`
- `/api/payment/stake-coins`
- `/api/payment/auto-stake`
- `/api/coins/balance`
- `/api/coins/purchase`
- `/api/coins/withdraw`
- `/api/coins/distribute-battle`

### 7.3 Battles and Leagues

- `/api/battle/award-xp`
- `/api/battle/distribute-prizes`
- `/api/leagues/start`
- `/api/leagues/distribute`
- `/api/cron/admin-tasks`

The cron endpoint runs daily according to `vercel.json` at midnight UTC.

### 7.4 Referrals and Spin

- `/api/referral/apply`
- `/api/referral/process-bonus`
- `/api/referral/apply/process-bonus`
- `/api/spin`
- `/api/spin-wheel`
- `/api/spin-wheel/segments`
- `/api/spin-wheel/claim`

### 7.5 AI and Feature Flags

- `/api/ai/school-insight`
- `/api/feature-flags`
- `/api/admin/feature-flags`

The AI endpoint reads `ANTHROPIC_API_KEY` when configured. The key is not currently included in the example environment file.

## 8. Data Model as Used by the Code

No SQL migrations or database dump are currently stored in this workspace. The following tables are inferred from application usage and should be considered a code reference, not a verified schema dump:

- `profiles`
- `wallets`, `transactions`, `withdrawal_requests`
- `arena_coins`, `arena_coin_wallets`, `coin_transactions`
- `questions`, `practice_sessions`
- `battle_rooms`, `room_players`, `battle_answers`, `battle_requests`, `matchmaking_queue`
- `leagues`, `league_entries`
- `missions`, `user_missions`
- `daily_spins`, `spin_attempts`, `wheel_segments`
- `user_ranks`, `user_xp`, `user_subject_wins`, `user_streaks`
- `referrals`, `referral_earnings`
- `schools`, `school_admin_profiles`, `school_leaderboard`
- `hall_of_fame`
- `user_presence`, `user_notifications`
- `platform_settings`
- `admin_accounts`, `admin_logs`

Other inferred names include `public`, but this is likely storage usage rather than a Postgres table.

## 9. Environment and Secrets

Local `.env.local` contains environment variable names for:

- Supabase URL and anonymous key.
- Supabase service-role key.
- Spin wheel secret and testing flag.
- Vercel OIDC token.

`.env.example` documents:

- Supabase URL and keys.
- Spin wheel secret/testing mode.
- Paystack secret/public keys.

The code also uses additional variables:

- `NEXT_PUBLIC_APP_URL`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET`

### Security Requirements

- Never commit `.env.local` or real service-role/payment/AI keys.
- Rotate keys if a key has previously been exposed.
- Replace the fallback spin wheel secret in production.
- Prefer server-side-only service-role access.
- Verify that Supabase Row-Level Security policies protect every table.

## 10. Scripts and Maintenance Utilities

Available scripts include:

- `npm run dev` — development server.
- `npm run build` — production build.
- `npm run start` — production Next.js server.
- `npm run lint` — ESLint.

Additional utilities include:

- `import_questions.js`
- `debug-users.js`
- `decode-key.js`
- `fix.js` through `fix6.js`
- `rewrite-dashboard.js`
- `scripts/create-super-admin.ts`
- `scripts/setup-super-admin.mjs`

Several root utility scripts appear to be ad hoc migration/fix tools. They should be reviewed, documented, and archived before relying on them for future deployments.

## 11. Build and Deployment

The project is configured for Vercel and has a Vercel cron definition for `/api/cron/admin-tasks` daily.

Deployment requirements:

1. Install dependencies with `npm install` or `npm ci`.
2. Configure all required environment variables in Vercel.
3. Configure the Supabase project and required tables/RPC functions/storage policies.
4. Configure Paystack keys and callback URL.
5. Configure the cron secret if used.
6. Run `npm run build`.
7. Run `npm run start` locally or deploy with Vercel.

The workspace contains build log and output text files. `.next/` exists and contains a local build cache, but it is not source code and is ignored by Git.

## 12. Backup and Local-Host Status

### 12.1 Source Code

**Status: Backed up to Git and GitHub.**

Verified on November 20, 2026:

- Git branch: `master`
- Branch tracking: `origin/master`
- Working tree: clean
- No untracked source files outside ignored content
- 149 files tracked by Git
- Remote: `https://github.com/dreamklick0-byte/quiz-arena.git`

This means the tracked source code and project files in the latest checkout are represented in the GitHub repository.

### 12.2 `.env.local` and Secrets

**Status: Not backed up by Git.**

`.env.local` exists locally but is ignored. It may contain real credentials and should not be committed directly. It should be copied into a secure password manager, encrypted backup, or a protected secrets vault.

`.env.example` is also currently ignored by the malformed/overbroad `.env*` ignore rule, despite being useful tracked documentation. This should be corrected if GitHub is intended to retain future example configuration changes.

### 12.3 Database

**Status: Not locally backed up.**

Supabase is external to this XAMPP workspace. No `.sql` migration folder, SQL dump, SQLite database, or database backup file was found.

Therefore:

- Supabase table data is not stored in the local project.
- Supabase users are not stored locally.
- Wallet, battle, league, question, referral, and school data must be backed up from Supabase separately.
- Supabase Storage school logos are not backed up as a local image folder.

### 12.4 `node_modules` and `.next`

**Status: Local-only generated content, not source backups.**

Both directories exist locally but are ignored by Git:

- `node_modules/` is reproducible from `package-lock.json`.
- `.next/` is a generated build cache/output and reproducible by building.

They should not be the only copy of source code, but their loss can be recovered through dependencies and build steps.

### 12.5 Vercel

**Status: Deployment configuration is tracked; deployment state is external.**

`vercel.json` and the tracked source are locally/GitHub backed. `.vercel/` is ignored and is not a full deployment backup. Deployment environment variables and Vercel project settings are not present locally.

### 12.6 Local Files and Old Versions

There is a single `app/spin/page.tsx.backup` file. It is a file-level backup, not a complete project backup. The root `quiz-arena/` folder is empty. No ZIP, archive, SQL dump, or dedicated backup directory was found outside dependencies/build outputs.

### 12.7 Overall Backup Verdict

**The application source is backed up in GitHub and locally. The database and secrets are not comprehensively backed up.**

| Component | Local-host copy | GitHub/source backup | Separate backup needed |
|---|---:|---:|---:|
| Application source | Yes | Yes | Recommended additional archive |
| Git history | Yes, `.git/` | Yes, if pushed | Not necessary yet; verify remote |
| `.env.local`/real secrets | Yes | No | Yes |
| Supabase database | No | No | Yes |
| Supabase Storage | No | No | Yes |
| Supabase Auth/config | No | No | Yes |
| `node_modules` | Yes | Rebuildable | No |
| `.next` build cache | Yes | Rebuildable | No |
| Vercel settings/environment | Partially external | No | Yes |
| Paystack configuration | External/local env | No | Yes |

## 13. Recommended Backup Strategy

1. Confirm Git remote pushes are performed after every change.
2. Fix `.gitignore` so `.env.example` is trackable while all real `.env*` files remain excluded.
3. Export Supabase database schema and data regularly.
4. Store database migrations in a `supabase/migrations/` directory.
5. Document and export all Supabase Auth settings and RLS policies.
6. Export or synchronize Supabase Storage assets, especially school logos.
7. Store Vercel environment variable names and secure secret values in a secrets vault.
8. Back up Paystack-related configuration and webhook settings.
9. Create periodic encrypted ZIP archives of source, configuration templates, migration files, and project documentation.
10. Test recovery by rebuilding from Git and restoring a test database snapshot.

## 14. Current Risks and Technical Debt

- Database schema is not represented by migrations in the repository.
- Environment example coverage is incomplete: variables such as `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, and `CRON_SECRET` are not clearly documented in `.env.example`.
- `.gitignore` contains merge conflict markers and appears to be unresolved text from a merge.
- The project has ad hoc root maintenance scripts that may not be reproducible or safe.
- Several pages and APIs use direct Supabase access rather than centralized domain services.
- Some marketing values and counts may be illustrative rather than dynamically verified.
- External Unsplash images create runtime dependence on third-party availability.
- Multiple spin implementations/API routes can lead to duplicated or inconsistent behavior.
- Service-role operations must be reviewed for authorization and RLS bypass.
- Build log files are unstructured or encoded and do not provide a reliable current build status.
- No public local asset folder or database seed/migration snapshot was found.

## 15. End-to-End Core Flows

### 15.1 User Registration

1. User opens `/auth`.
2. Supabase creates/authenticates the account.
3. Application inserts or updates `profiles`.
4. Application ensures a `wallets` record exists.
5. Optional referral code is applied.
6. User is directed into the application experience.

### 15.2 Practice Flow

1. User chooses a subject from `/practice`.
2. Questions are loaded from Supabase or local practice data.
3. Answers are presented and scored.
4. XP, streak, and practice session records are updated.
5. Rank and mission progress can update.

### 15.3 Battle Flow

1. User creates or joins a room.
2. Battle room and player records are created.
3. Optional coins are staked.
4. Realtime room status and player readiness are synchronized.
5. Both players receive and answer questions.
6. Scores are saved to `room_players` and `battle_answers`.
7. Results are calculated.
8. XP and prize distribution occur.
9. User may request or accept a rematch.

### 15.4 Payment Flow

1. User requests a Paystack initialization.
2. Server creates a Paystack transaction and callback URL.
3. User completes payment.
4. Paystack calls or redirects through the verification endpoint.
5. Wallet and transaction records are updated.

### 15.5 League Flow

1. League is displayed and joined from `/league`.
2. Entry, score, and time are recorded.
3. Scheduled/admin tasks start or close the league.
4. Participants are ranked.
5. Distribution routine awards league prizes.
6. Results are shown on the dynamic results route.

### 15.6 Withdrawal Flow

1. User submits a withdrawal request.
2. Withdrawal and wallet/coin state are recorded.
3. Admin reviews `/admin/withdrawals`.
4. Admin approves or rejects it through an API route.
5. Transaction and audit records are updated.

## 16. Local Development Notes

Typical setup:

```powershell
cd C:\xampp\htdocs\quiz-arena
npm install
npm run dev
```

Open `http://localhost:3000`.

Before running, create a complete `.env.local` based on `.env.example` and add any additional variables used by the implementation.

## 17. Final Assessment

Quiz Arena is a substantial full-stack application with a clear Next.js frontend, external Supabase backend, realtime battles, payment flows, gamification, school features, leagues, and an admin panel.

The tracked application source is well-positioned for recovery because the working tree is clean and synchronized with the GitHub remote shown in this audit. However, source backup alone does not protect the live product: the Supabase database, Supabase Storage, Auth configuration, Vercel environment variables, payment settings, and secret values require a separate documented backup and restore process.
