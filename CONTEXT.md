# Game Shelf Ecosystem - Active Development Context

**Archive Date:** January 27, 2026 (Evening)  
**Archive Version:** gs-active-2026-01-27-evening

---

## Current Versions

| App | Version | Key Features |
|-----|---------|--------------|
| Game Shelf | 1.2.67 | Auth hardening, error handling, reset purchase limits |
| Quotle | 1.2.2 | 390 quotes, PWA path fixes, presidential quotes |
| Rungs | 1.0.12 | Fixed rung movement direction |
| Slate | 1.0.12 | Word puzzle game |
| Word Boxing | 1.0.7 | Multiplayer word battle |
| Command Center | 8.2.1 | Blob API for large files, promotion CDN fix |
| Test Plan | 4.0.1 | Added version meta tag |
| Landing Page | 1.1.0 | Marketing page |

---

## Game Shelf v1.2.57-61 - Recent Changes

### v1.2.61 (Current)
- Latest stable release

### v1.2.57: Game Recording UX Redesign
- Removed automatic clipboard pop-up on returning from games
- No more confusing "paste" prompts from iOS
- New "Record Previous Game?" prompt flow:
  - Only appears when clicking a NEW game
  - If you visited a game but didn't record it
  - Two options: "Record [Game]" or "Go to [New Game]"
- Users learn to hit "Record Game" button on main screen

### v1.2.56: Wallet Sync Fix
- Fixed wallet not loading from Firebase on app open
- Coins from purchases now appear correctly

### v1.2.55: Wallet Explanations
- Wallet explanations now include battles

### v1.2.54: Buy Coins Simplified
- Buy Coins page simplified

### v1.2.53: Purchase Error Messages
- Better purchase error messages

---

## Game Shelf v1.2.47 - Battle Scoring Rebalance

Comprehensive scoring rebalance across all games:

**Core NYT Games:**
- Wordle: 1/6=50 (hole-in-one!), 2/6=30, 3/6=22, 4/6=15, 5/6=10, 6/6=6
- Connections: 0 mistakes=30, 1=24, 2=18, 3=12 (gradual penalty)
- Strands: 0 hints=28, 1=25, 2=22, 3=19 (softer penalty)
- Mini: <45s=28, smoother decay to floor of 12

**6-Guess Games (Worldle, Tradle, Framed, etc.):**
- 1/6=35, 2/6=28, 3/6=22, 4/6=16, 5/6=10, 6/6=6

**LinkedIn Games:**
- Queens/Tango/Crossclimb/Zip: Smoother time curves
- Pinpoint: 1 guess=35, 2=28, 3=22, 4=16, 5=10

**GS Originals:**
- Quotle: 1/4=50 (hole-in-one!), 2/4=30, 3/4=20, 4/4=12
- Rungs: Perfect=35, 2 attempts=28, 3=21, 4=14

---

## Game Shelf v1.2.27 - Major Changes

### AI Hint System (NEW)

A complete AI-powered hint system integrated with Firebase Cloud Functions:

**Features:**
- 💡 Floating Action Button (FAB) - always visible, orange color
- Bottom sheet UI for hint selection
- 10 hint levels from "Whisper" to "Answer"
- Rate limited: 20 hints/hour, 50 hints/day per user
- Requires Google sign-in (Firebase Auth)

**Supported Games:**
- NYT Games (via web search): Connections, Wordle, Strands, Spelling Bee, Mini
- Game Shelf originals (local data): Quotle, Rungs, Slate

**Firebase Functions Deployed:**
- `getHint` - Main hint generation endpoint
- `getHintUsage` - Usage stats retrieval
- Project: word-boxing
- Region: us-central1

**System Prompt Improvements:**
- "CRITICAL: Give ONLY the hint" - no preamble
- Level-appropriate responses (won't reveal solution at low levels)
- Word count limits for concise hints

### iOS Clipboard Fixes

**Fixed double paste popup:**
- On iOS, if `clipboard.read()` fails, no longer falls back to `clipboard.readText()`
- Prevents user seeing two paste popups in a row

**Fixed unwanted paste popups:**
- Removed clipboard check on settings open
- Removed clipboard check on tab switch
- Clipboard++ monitor disabled on iOS
- Clipboard only read when user taps game card or Record Game button

### UI Changes

- Hint FAB positioned at bottom: 160px, right: 20px (above share FAB)
- Orange gradient background (#f59e0b → #d97706)
- All 8 games selectable in hint sheet chips
- Default game selection based on last launched game

---

## Quotle v1.2.2 - Changes

### v1.2.0: Quote Cleanup & Reorganization

**Removed 3 anonymous/proverb quotes:**
- African Proverb, Unknown, Chinese Proverb

**Added 11 modern public domain quotes:**
- JFK (2), MLK (3), Neil Armstrong, Nelson Mandela (2), Peter Drucker, Einstein, Al Gore

**Reordered quotes:**
- Position 0: Today's quote preserved
- Positions 1-20: Famous/recognizable authors
- Positions 21+: Shuffled remaining

**Reset launch date:** 2026-01-26 (starts fresh)

### v1.2.1: Presidential Quotes

**Added 17 presidential/government quotes:**
- Ronald Reagan (4)
- George H.W. Bush (1)
- Bill Clinton (3)
- George W. Bush (2)
- Barack Obama (5)
- Lyndon B. Johnson (1)
- Abraham Lincoln (1)

**Total quotes:** 390

### v1.2.2: PWA Path Fixes

**Problem:** PWA got 404 errors when added to home screen (absolute paths)

**Fixed paths from absolute to relative:**
- sw.js: `'/'` → `'./'`, `'/index.html'` → `'./index.html'`
- manifest.json: `start_url` and `scope` to `"./"` 
- index.html: SW register `'/sw.js'` → `'./sw.js'`

---

## Rungs v1.0.12 - Changes

### Fixed: Rung Movement Direction Reversed

**Problem:** Up arrow (▲) moved rungs down, down arrow (▼) moved up

**Root Cause:** Stack uses `flex-direction: column-reverse`, so higher indices appear at top

**Fix:** Swapped direction parameters:
- ▲ button now calls `moveStackItem(i, 1)` (higher index = visually up)
- ▼ button now calls `moveStackItem(i, -1)` (lower index = visually down)

---

## Firebase Functions Setup

Located in `/firebase-functions/`:

```
firebase-functions/
├── firebase.json
├── README.md
└── functions/
    ├── index.js
    ├── package.json
    └── .env.example
```

**Deployment:**
```bash
cd firebase-functions
firebase use word-boxing
firebase deploy --only functions
```

**Environment:**
- Create `functions/.env` with `ANTHROPIC_API_KEY=sk-ant-...`
- Runtime: Node.js 20
- Model: claude-sonnet-4-20250514

**⚠️ Security Note:** 
- Anthropic API key exposed in original session - should be regenerated
- Firebase client keys are designed to be public (protected by Security Rules)

---

## File Structure

```
gs-active/
├── gameshelf/
│   ├── index.html      (v1.2.61 - recording UX, wallet sync)
│   ├── sw.js
│   ├── manifest.json
│   ├── manifest-test.json
│   ├── icons/
│   ├── icons-test/
│   └── RELEASE_NOTES.txt
├── quotle/
│   ├── index.html      (v1.2.2 - 390 quotes, paths fixed)
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── rungs/
│   ├── index.html      (v1.0.12 - movement fix)
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── slate/
│   ├── index.html      (v1.0.12)
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── wordboxing/
│   ├── index.html      (v1.0.7)
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── command-center/
│   └── index.html      (v8.0.0 - Streamlined nav + Quick Actions)
├── testplan/
│   └── index.html      (v4.0.1)
├── landing/
│   └── index.html      (v1.1.0)
├── migration-tool/
│   ├── index.html
│   └── README.md
├── firebase-functions/
│   ├── firebase.json
│   ├── README.md
│   └── functions/
├── CONTEXT.md          (this file)
├── FEATURE_INVENTORY.md
├── STANDARDS.md
├── SECURITY_AUDIT.md
├── ECONOMIC_ANALYSIS.md
├── IMPLEMENTATION_PLAN.md
└── README.md
```

---

## Deployment Notes

### Game Shelf
- Deploy to GitHub Pages
- Firebase Functions must be deployed separately for hints to work
- Requires Blaze plan (pay-as-you-go) for Cloud Functions

### Quotle
- Launch date reset to Jan 26, 2026
- All paths relative for subdirectory deployment
- 390 quotes total

### Rungs
- Simple fix, backward compatible
- No configuration changes needed

---

## Known Issues / TODO

1. ~~**Regenerate Anthropic API key**~~ - ✅ Done (January 25, 2026)
2. **Add HTTP referrer restrictions** to Firebase API key (optional security hardening)
3. **Hint FAB overlaps UAT feedback button** - Different positions, but both in bottom area
4. **Firebase Functions max_tokens** - Reduced to 250 for speed, may need tuning

---

## Session History

**January 27, 2026:**
- Updated CONTEXT.md with current versions (GS 1.2.62, CC 8.0.0)
- Game Shelf v1.2.62: URL migration to gameshelf.co, UAT→Feedback rename
- Command Center v8.0.0 "Efficiency Update":
  - Consolidated navigation: 12 tabs → 4 dropdown menus (Deploy, Monitor, Maintain, Configure)
  - Quick Actions Bar with one-click: Deploy All, Sync TEST→PROD, Bump Versions, Health Check
  - New Deploy All Modal with file selection and target choice
  - New Sync Environments Modal for batch TEST→PROD promotion
  - New Version Bump Modal with patch/minor/major options
  - Status indicators in header (GitHub, Firebase connection status)
  - Integrations tab for Firebase, Claude API, Stripe, Goody management
  - Cleanup tab with file restoration from Git history
- Created Command Center Analysis & Recommendations document
- Documented v1.2.53-62 changes
- Updated file structure to reflect all files in archive

**January 26, 2026 (Session 4):**
- Game Shelf v1.2.49 → v1.2.61 (recording UX redesign, wallet sync)
- Command Center v7.2.6 → v7.3.0 (consolidated repo support)

**January 25, 2026 (Session 1):**
- Quotle v1.2.0 → v1.2.2 (quotes + paths)
- Rungs v1.0.11 → v1.0.12 (movement fix)
- Game Shelf iOS clipboard session state

**January 25, 2026 (Session 2):**
- Game Shelf v1.2.18 → v1.2.27 (AI hints)
- Firebase Cloud Functions deployment
- iOS clipboard fixes (double paste, unwanted popups)
- Hint system refinements (no preamble, level-appropriate)

**January 25, 2026 (Session 3):**
- Game Shelf v1.2.27 → v1.2.29
- v1.2.28: AI Hint auto-retry, better loading UX, conditional web search
- v1.2.29: Fixed hint game detection (prioritize lastLaunchedGame over stale localStorage)
- Regenerated Anthropic API key (confirmed)
- Documented deployment package structure in gs-active skill

## Session: January 27, 2026 (Afternoon) - Firebase Automation & Transaction History

### Firebase Functions - GitHub Actions Deployment ✅
- Set up automated deployment via GitHub Actions
- Workflow file: `.github/workflows/deploy.yml`
- Repository: `stewartdavidp-ship-it/gameshelf-functions`
- Environment variables managed through GitHub Secrets:
  - `FIREBASE_TOKEN`
  - `ANTHROPIC_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Deployment triggered on push to main branch
- **Stripe Integration WORKING** - Coin purchases and webhook handling verified
- Weekly spending limit ($50) enforced

### Command Center Updates (v8.0.0 → v8.1.8)
| Version | Changes |
|---------|---------|
| v8.1.0 | Added Firebase Functions app definition |
| v8.1.1 | Fixed version display |
| v8.1.2 | Auto-select PROD for Firebase Functions |
| v8.1.3 | Added YML file support and auto-detection for workflow files |
| v8.1.4 | Enhanced error logging |
| v8.1.5 | Single file deploy uses Contents API (more reliable than Git Data API) |
| v8.1.6 | Better error messages, branch parameter |
| v8.1.7 | Workflow scope error detection, spinner fix on failed deploys, helpful error messages |
| v8.1.8 | **Fixed version revert bug** - GitHub CDN caching was causing deployed versions to jump back. Added cache-busting for large files, disabled auto-refresh after deploy |

### Game Shelf v1.2.63
- **NEW: Transaction History** in Wallet section
  - Shows coin purchases (amount, cost, date)
  - Shows token usage (AI hints)
  - Shows gift redemptions
  - Sorted by date (newest first)
  - Last 50 transactions displayed
- Access via: Wallet → "📜 Transaction History" button

### Deployment Workflow (Final)
**For Firebase Functions (index.js):**
1. Upload to Command Center
2. Auto-detects as Firebase Functions, auto-selects gameshelf-functions repo
3. Deploy → pushes to GitHub → GitHub Actions deploys to Firebase

**For workflow files (deploy.yml):**
- Requires GitHub token with `workflow` scope
- Command Center now supports this (v8.1.7+)

### Key Fixes
- GitHub token needs `workflow` scope to modify `.github/workflows/` files
- Large file downloads need cache-busting to avoid stale versions
- Don't auto-refresh versions immediately after deploy (GitHub CDN lag)

---

## Session: January 27, 2026 (Evening) - Security Hardening & Error Handling

### Security Audit Implementation

Completed comprehensive security hardening based on SECURITY_AUDIT.md recommendations:

**Auth State Consistency Audit**
- Verified 150+ `currentUser` usages all have proper null guards
- No orphaned `firebaseUser` or `window.firebase` references
- All auth-dependent functions have guard clauses

**Firebase Initialization Hardening (v1.2.65)**
- App no longer crashes if Firebase SDK blocked (ad blockers, CDN blocks)
- Graceful fallback to offline mode with localStorage
- New `firebaseAvailable` flag for conditional Firebase operations

**Clipboard Error Handling (v1.2.65)**
- Fixed 7 unhandled clipboard promise rejections
- All `navigator.clipboard.writeText()` calls now have `.catch()` handlers
- User-friendly error toasts on copy failure

### Error Handling Audit (v1.2.66)

Fixed async functions missing try/catch:
- `convertCoins()` - Now catches cloud sync errors
- `forceRefresh()` - Promise chain with proper error handling
- `forceAppUpdate()` - getRegistration() error handling
- `loadFromCloud().then()` - Error handling on auth restore

### Reset Purchase Limits Feature (v1.2.67)

**Problem:** After "Reset All Data", purchase history in Firebase remains, blocking test purchases due to weekly limit.

**Solution:**
- New Firebase Function: `resetPurchaseHistory`
- New UI: Settings → Developer → "Reset Purchase Limits"
- Validates wallet at default state before allowing reset
- Clears `purchases/{userId}` node in Firebase

### Command Center Updates (v8.1.8 → v8.2.1)

| Version | Changes |
|---------|---------|
| v8.2.0 | Fixed large file promotion using download_url |
| v8.2.1 | **Blob API for large files** - Uses Git Blob API instead of download_url to bypass CDN caching. Fixes promotion fetching stale versions. |

**Root Cause of Promotion Bug:**
- Game Shelf index.html is 1.2MB (>1MB GitHub limit)
- Contents API doesn't return file content for large files
- Previous code used `download_url` → `raw.githubusercontent.com` CDN
- CDN caches aggressively and ignores query string cache-busters
- **Fix:** Use Git Blob API (`/repos/{owner}/{repo}/git/blobs/{sha}`) which fetches by exact SHA, no caching

### Firebase Rules v2 (Prepared)

Created hardened security rules based on audit:
- User data restricted to own UID only
- Wallet validation (tokens ≤10,000, coins ≤1,000)
- Referral write-once protection
- Auth required for games/lobby writes
- New paths: public-battles, contact-hashes, nudges, tokenHistory

### Files Updated This Session
- `gameshelf/index.html` - v1.2.67
- `gameshelf/sw.js` - Cache v1.2.67
- `gameshelf/RELEASE_NOTES.txt` - Updated
- `command-center/index.html` - v8.2.1
- `firebase-functions/functions/index.js` - Added resetPurchaseHistory

### Deployment Notes
1. Deploy Command Center v8.2.1 first (fixes promotion CDN bug)
2. Deploy Game Shelf v1.2.67 via Command Center
3. Deploy Firebase Functions via Command Center → GitHub Actions
4. Firebase Rules v2 - Deploy via Firebase Console (test in Rules Playground first)
