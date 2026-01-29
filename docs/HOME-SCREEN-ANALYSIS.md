# Home Screen Deep Code Review - User Perspective

**Date:** January 29, 2026  
**Version Reviewed:** 1.3.0  
**Fixes Applied In:** 1.3.1

---

## 1. Your Games Grid (`renderHomeGames`)

**What it does:** Shows first 6 games from shelf with status indicators.

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| Tap a game → play it | ✅ Calls `playGame()` | Works |
| See which games I've done | ✅ Shows checkmark + score | Works |
| See my streak | ✅ Shows 🔥 + count | Works |
| Long-press for options | ✅ v1.3.0 added this | Works |

**Issues Found:**

1. **Hard-coded limit of 6 games** - Users with 7+ games might wonder why they don't see all. The "+X more" text helps, but no way to configure.

2. **No loading state** - If `GAMES[g.id]` returns undefined (corrupted data), the game card silently disappears.

3. **Status text inconsistency** - If streak is 0 but game NOT done, shows "Play". But if you've played 50 games but lost streak, still just "Play" with no historical context.

---

## 2. Record Game Button (`handleRecordButtonDown/Up`, `handleRecordGame`)

**Interaction Model:**
- Tap = read clipboard
- Hold (600ms) = open manual log sheet

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| Tap once, results logged | ✅ If clipboard has valid content | Works |
| Hold to manually enter | ✅ Opens log sheet | Works |
| Know what's happening | ⚠️ Sometimes silent | Issue |

**Issues Found:**

1. **Silent failure on iOS** - When `clipboard.read()` fails, code silently opens log sheet after 800ms. User doesn't know if read worked.

2. **Race condition potential** - The `recordButtonHandled` flag prevents double-triggers, but 500ms reset delay could allow fast double-tap issues.

3. **Confusing feedback hierarchy:**
   - "📋 Nothing to paste" vs "❓ Couldn't recognize game content" vs silent log sheet
   - Users can't tell difference between empty clipboard, wrong content, permission denied

4. **Help text ambiguity** - "Hold for manual entry" but users might not realize 600ms = "hold"

**Recommendation:** Add pulse animation when starting hold timer so users know they're in "hold mode".

**Fixed in v1.3.1:** Standardized feedback messages for consistency.

---

## 3. Quick Games Row (`renderQuickGames`)

**What it does:** Shows emoji buttons for first 6 shelf games.

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| Tap emoji → play game | ✅ v1.3.0 fixed this | Works |
| See done status | ✅ `.done` class applied | Works |
| Long-press for options | ❌ Not implemented | **Missing** |

**Issues Found:**

1. **No long-press on quick games** - Main grid has `setupLongPress()` but quick buttons do not. Inconsistent.

2. **Duplicate of main grid** - Same 6 games twice on Home (grid + quick buttons). Takes space without adding value.

3. **No tooltip on mobile** - `title` attribute helps desktop, not mobile.

**Fixed in v1.3.1:** Added long-press support to quick game buttons.

**Recommendation:** Consider removing quick games OR differentiating them (e.g., only show games NOT played today).

---

## 4. Progress Section (`renderProgress`)

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| See X/Y games played | ✅ Clear display | Works |
| Progress bar fills up | ✅ Animates | Works |
| Streak visible | ⚠️ Shows MAX streak | Misleading |
| Share when done | ✅ Button appears | Works |

**Issues Found:**

1. **Max streak logic** - Shows `getMaxStreak()` not current streak. If user's best was 50 but current is 3, they see "🔥 50" which is misleading.

2. **Goal defaults to 5** - First-time users have no idea why it's 5 or how to change it.

3. **Grammar** - "Play your first game!" should be "Play your first game today!" since they might have played before.

**Fixed in v1.3.1:** Now shows current max streak via new `getCurrentMaxStreak()` function.

---

## 5. Play Game Flow (`playGame` → `launchGame`)

Complex function with multiple decision points:

```
playGame(gameId)
  ├── Check for unrecorded previous game → show prompt
  ├── Check if already played today → show options sheet
  ├── Check if first-time user → show recording tutorial
  ├── Check if needs publisher preference → show modal
  └── launchGame(gameId)
        ├── Determine URL (test mode, custom URL, app vs browser)
        ├── Track analytics
        └── Open URL
```

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| Tap game → game opens | ⚠️ May hit 3-4 modals first | Friction |
| Quick to start playing | ⚠️ First-time setup heavy | Friction |
| Already played → visit anyway | ✅ Clear sheet | Works |

**Issues Found:**

1. **Unrecorded game prompt timing** - Only shows if >30 seconds elapsed. 29 seconds = no prompt. Undiscoverable.

2. **"Already Played" sheet has 3 options** - Users often just want to play again; this adds friction.

3. **Recording tutorial + publisher pref = 2 interruptions** before first-time user can play. High abandonment risk.

4. **`skipUnrecordedCheck` parameter** - Internal complexity leaking. 3 boolean params make function hard to reason about.

**NOT FIXED:** Per user request, onboarding section not changed - needs more investigation.

---

## 6. Long-Press / Game Options (`setupLongPress`, `showGameOptions`)

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| Long-press → see options | ✅ Works after 500ms | Works |
| Right-click on desktop | ✅ Context menu handled | Works |
| Remove from shelf | ✅ With confirmation | Works |

**Issues Found:**

1. **500ms long-press** is shorter than typical mobile OS (usually 800ms). May trigger accidentally.

2. **`longPressTarget` state** never cleared on touchend without triggering. Minor memory leak pattern.

3. **No visual feedback during long-press** - User doesn't know they're in "long-press mode".

4. **Remove confirmation always shows** - Good safety, but advanced users might want "don't ask again".

**Fixed in v1.3.1:** Added visual feedback (scale + purple glow) during long-press.

---

## 7. Friends Widget (`renderFriendsWidget`)

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| See if friends played today | ✅ ✓ vs ... indicator | Works |
| Tap friend → see profile | ✅ `showFriendProfile()` | Works |
| Know who's who | ⚠️ Just initials/avatars | Limited |

**Issues Found:**

1. **No names visible** - Just avatar circles with ✓ or "...". Must tap to see who's who.

2. **Hard-coded limit of 6** - What if user has 20 friends? No indication of "view all".

3. **Two different empty messages** - "Add friends to see their progress" vs "Sign in to see friends" could confuse.

**Fixed in v1.3.1:** Added first name below each avatar.

---

## 8. Battle Widget (`updateHomeBattleWidget`)

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| See current battle status | ✅ Shows standings | Works |
| Know time remaining | ⚠️ Shows "Xd" remaining | Imprecise |
| Know if I need to play | ✅ v1.2.77 added reminder | Works |

**Issues Found:**

1. **Only shows ONE battle** - `find()` returns first match. Multiple battles = only see one.

2. **Days remaining rounding** - `Math.ceil()` means 23 hours shows as "1d" which misleads if battle ends tonight.

3. **Reminder wording** - "⚠️ Still need: Wordle, Connections" reads oddly. Better: "⚠️ Still to play:"

**Fixed in v1.3.1:** 
- Shows most urgent battle (ending soonest)
- Shows "(+N more)" when in multiple battles
- Shows hours if <1 day remaining
- Improved reminder wording

---

## 9. Quick Share Recap (`quickShareRecap`)

| User Expects | Code Reality | Status |
|--------------|--------------|--------|
| One tap to share | ⚠️ Opens preview sheet first | Extra step |
| Share to any app | ✅ Multiple share options | Works |
| Nice image to share | ✅ Canvas-generated card | Works |

**Issues Found:**

1. **No "quick" in quick share** - Opens full sheet with style options, preview, copy, share buttons. Truly quick would be one-tap to native share.

2. **Image generation on every open** - Even if user just wants to copy text, waits for canvas rendering.

**NOT FIXED:** Lower priority; current UX is reasonable for most users.

---

## Summary: Issues by Priority

| Priority | Issue | Status |
|----------|-------|--------|
| 🔴 High | Quick Games don't have long-press | ✅ Fixed v1.3.1 |
| 🔴 High | First-time user sees too many modals | ⏸️ Needs investigation |
| 🟡 Medium | Progress shows max streak not current | ✅ Fixed v1.3.1 |
| 🟡 Medium | No visual feedback during long-press | ✅ Fixed v1.3.1 |
| 🟡 Medium | Friends widget shows no names | ✅ Fixed v1.3.1 |
| 🟡 Medium | Record button feedback inconsistent | ✅ Fixed v1.3.1 |
| 🟡 Medium | Multiple battles only shows first | ✅ Fixed v1.3.1 |
| 🟢 Low | Quick share isn't actually quick | Not fixed |
| 🟢 Low | 500ms long-press may be too short | Not fixed |

---

## Pending Investigation: Onboarding Flow

The following areas need deeper analysis before changes:

1. **Recording Tutorial** - Is it necessary? What's the completion rate?
2. **Publisher Preference Modal** - Could this be deferred or simplified?
3. **Unrecorded Game Prompt** - Is the 30-second threshold right?
4. **Multiple modals before first game** - How to streamline without losing important setup?
