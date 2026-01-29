# Stats Tab Code Analysis

**Date:** 2026-01-29  
**Version Analyzed:** Game Shelf v1.2.78 → Fixed in v1.2.79

---

## Summary

Deep code review of the Stats tab and related daily notification/nudge functionality revealed **1 critical bug** that completely breaks streak calculation, plus **6 timezone mismatches** that could cause incorrect behavior near midnight.

All issues have been fixed in v1.2.79.

---

## 🔴 CRITICAL BUG: Streaks Never Increment Beyond 1

**Location:** `recordGameResult()` — Lines 15130-15146

**Status:** ✅ FIXED in v1.2.79

**The Problem:**
The code set `lastPlayed = today` BEFORE checking if `lastPlayed === yesterday`, causing the check to always fail.

**Fix:** Save `oldLastPlayed` before updating, use it for comparison, add proper reset logic.

---

## 🟠 TIMEZONE BUGS: UTC vs Local Time Mismatches

**Status:** ✅ ALL FIXED in v1.2.79

History keys are stored using local time (via `getTodayString()`), but several functions were looking up history using UTC time (via `toISOString().split('T')[0]`).

| Location | Function | Impact |
|----------|----------|--------|
| Line 15139 | `recordGameResult()` | Streak calculation wrong near midnight |
| Line 11570 | `publishPublicProfile()` | Public profile streak wrong |
| Line 11684 | `renderFriendsLeaderboard()` | Leaderboard streak wrong |
| Line 11979 | `loadSentNudges()` | Nudge tracking could fail |
| Line 13943 | `generateActivitySummary()` | Activity summary missing games |
| Line 15793 | `calculateStreak()` | Debug/feedback streak wrong |

**Fix:** Added `getLocalDateString(date)` helper and replaced all UTC conversions.

---

## ✅ Functions That Were Already Correct

| Function | Why It's Correct |
|----------|------------------|
| `generateSuggestions()` | Uses `getTodayString()` for `today` variable |
| `renderStatsScreen()` | Just reads from `appData.stats`, doesn't calculate dates |
| `showGameStatsDetail()` | Same - just displays existing stats |
| `getTodayHistory()` | Uses `getTodayString()` |
| `getGamesPlayedToday()` | Uses `getTodayHistory()` |
| `getMaxStreak()` | Just finds max from existing stats, no date calc |
| `hasNudgedToday()` | Uses `getTodayString()` |
| `nudgeFriend()` | Uses `getTodayString()` |
| `checkReceivedNudges()` | Uses `getTodayString()` |

---

## Notification/Suggestion Logic Review

### Streak At Risk (generateSuggestions)
```javascript
if (stats?.currentStreak >= 3 && stats.lastPlayed !== today)
```
✅ **Correct** - Uses local time for both comparisons

### Milestone Approaching
```javascript  
if (nextMilestone && (nextMilestone - stats.currentStreak) <= 2)
```
✅ **Correct** - Pure math on streak values

### Not Played Recently
```javascript
const daysSince = Math.floor((now - lastPlayed) / (24 * 60 * 60 * 1000));
```
✅ **Correct** - Date math works regardless of timezone

### Daily Goal Progress
```javascript
const todayPlayed = getGamesPlayedToday();
```
✅ **Correct** - Uses helper that uses local time

---

## New Additions in v1.2.79

### `getLocalDateString(date)` Helper
Converts any Date object to local YYYY-MM-DD string. Use instead of `toISOString().split('T')[0]`.

### `validateStreaksOnStartup()`
Runs on app init, resets any broken streaks where `lastPlayed` is not today or yesterday.

---

## Test Cases for Playwright

1. **First play ever** → streak = 1
2. **Play consecutive days** → streak increments  
3. **Play same game twice in one day** → streak unchanged
4. **Skip a day then play** → streak resets to 1
5. **Skip multiple days** → streak resets to 1
6. **Play near midnight (local time)** → correct day attribution
7. **Open app after missing days** → UI shows reset streak
8. **Import stats with higher streak** → streak updates correctly
9. **Streak at risk notification** → shows when streak ≥3 and not played today
10. **Nudge tracking** → persists correctly across midnight
11. **Activity summary** → counts games from correct days
12. **Leaderboard streak** → matches actual play history
