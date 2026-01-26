# Game Shelf Ecosystem - Active Development Context

**Archive Date:** January 26, 2026  
**Archive Version:** gs-active-2026-01-26

---

## Current Versions

| App | Version | Key Features |
|-----|---------|--------------|
| Game Shelf | 1.2.49 | Deep link fixes, tutorial update |
| Quotle | 1.2.2 | 390 quotes, PWA path fixes, presidential quotes |
| Rungs | 1.0.12 | Fixed rung movement direction |
| Slate | 1.0.12 | Word puzzle game |
| Word Boxing | 1.0.7 | Multiplayer word battle |
| Command Center | 7.2.6 | Deployment management |
| Test Plan | 4.0.1 | Added version meta tag |
| Landing Page | 1.1.0 | Marketing page |

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
│   ├── index.html      (v1.2.27 - AI hints, iOS fixes)
│   ├── sw.js
│   ├── manifest.json
│   ├── icons/
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
│   └── (unchanged)
├── wordboxing/
│   └── (unchanged)
├── command-center/
│   └── (user's version)
├── testplan/
│   └── (user's version)
├── firebase-functions/
│   ├── firebase.json
│   ├── README.md
│   └── functions/
└── CONTEXT.md          (this file)
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
