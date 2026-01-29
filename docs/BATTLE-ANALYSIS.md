# Game Shelf Battle System - Deep Code Analysis

## Test Scenarios

### Scenario 1: Basic Total Score Battle
**Setup:** Dave creates 3-day battle, "Weekend Warriors", Total Score type, Wordle + Connections, 2 coins stake
**Participants:** Dave, Sarah

**Day 1:**
- Dave: Wordle 3/6 (25 pts), Connections 0 mistakes (30 pts) = 55 pts
- Sarah: Wordle 4/6 (20 pts), Connections 1 mistake (24 pts) = 44 pts

**Day 2:**
- Dave: Wordle 5/6 (15 pts), doesn't play Connections
- Sarah: Wordle 2/6 (28 pts), Connections 2 mistakes (18 pts) = 46 pts

**Day 3:**
- Dave: Wordle 6/6 (5 pts), Connections 0 mistakes (30 pts) = 35 pts
- Sarah: Wordle X (0 pts), Connections 3 mistakes (12 pts) = 12 pts

**Expected Final:**
- Dave: 55 + 15 + 35 = 105 pts (WINNER)
- Sarah: 44 + 46 + 12 = 102 pts

**Prize Pool:** 2 + 2 = 4 coins
**Winner gets:** 3 coins (80%), Runner-up: 1 coin (20%)

---

### Scenario 2: Streak Challenge Battle
**Setup:** 7-day battle, Streak Challenge type, Wordle only, friendly (no stake)

**Rules should be:**
- Play Wordle every day for 7 days
- Each day completed = +10 bonus points
- Missing a day = streak broken, lose all bonus

**Day 1-5:** Both players play daily, earn 10 pts bonus each day
**Day 6:** Player A misses the day
**Day 7:** Both play

**Expected:**
- Player A: Game scores + 0 bonus (streak broken on day 6)
- Player B: Game scores + 70 bonus (7 days × 10)

---

### Scenario 3: Double-Logging Bug
**Setup:** Active battle with Wordle

**Sequence:**
1. User logs Wordle 3/6 (25 pts) via clipboard paste
2. Battle score updated: dailyScores["2026-01-28_wordle"] = 25, total = 25
3. User realizes they got 2/6, pastes correct score
4. Conflict modal appears, user clicks "Replace"
5. Local history updated to 2/6

**Current Behavior (BUG):**
- `resolveScoreConflict` updates local data but does NOT recalculate battle score
- Battle still shows 25 pts even though local history shows 28 pts

**Expected Behavior:**
- Battle score should be updated to match the replaced score

---

### Scenario 4: Rapid Multi-Game Logging
**Setup:** Active battle with Wordle, Connections, Strands

**Sequence (within 2 seconds):**
1. User pastes Wordle 3/6 (25 pts)
2. User pastes Connections (30 pts)
3. User pastes Strands (22 pts)

**Current Code (Race Condition):**
```javascript
const newTotal = (participant?.score || 0) + score;
await db.ref(...).set(newTotal);
```

**Problem:**
- All three reads might see the same initial value (0)
- All three writes might set total = their score alone
- Final result could be just 22 pts instead of 77 pts

---

### Scenario 5: Token vs Coin Stakes
**Setup:** Battle with 100 token stake

**Current Code Bug (line 18509):**
```javascript
const prizePool = (battle.entryFee || 0) * participants.length;
```

**Problem:**
- `entryFee` is only set for coin battles
- Token battles have `stakeType: 'tokens'` and `stakeAmount: 100`
- Prize pool calculates as 0!

**Current Code Bug (line 18548):**
```javascript
appData.wallet.tokens = (appData.wallet?.tokens || 0) + winnerPrize;
```

**Problem:**
- Always awards tokens even if stake was coins
- Coin battle winners should get coins back

---

## Critical Bugs Found

### BUG 1: Battle Type Scoring Not Applied
**Severity:** CRITICAL
**Location:** `updateBattleScore()` function
**Status:** ✅ FIXED via Firebase Function

**Problem:**
The `BATTLE_TYPES[type].scoring()` function is defined but NEVER called. All battles use raw `numericScore` regardless of battle type.

**Impact:**
- "Most Wins" battles: Should be 1 pt per win, actually uses raw score (15-30 pts)
- "Perfect Hunter" battles: Should be 1 pt per perfect, actually uses raw score
- "Streak Challenge" battles: Should add +10 daily bonus, never added

**Solution (v1.2.77):**
Server-side Firebase function `calculateBattleScore` now handles scoring:
- Triggers on any participant data change
- Looks up battle type and applies correct scoring
- Client provides `dailyMeta` with `won` and `perfect` flags
- Server recalculates authoritatively

```javascript
// Firebase trigger: battles/{battleId}/participants/{odataId}
const BATTLE_SCORING = {
    'total-score': { calculate: (scores, meta) => sum(scores) },
    'wins': { calculate: (scores, meta) => count(meta where won) },
    'perfect': { calculate: (scores, meta) => count(meta where perfect) },
    'streak': { calculate: (scores, meta, games) => sum(scores) + (completeDays * 10) }
};
```

---

### BUG 2: Double-Counting on Score Replace
**Severity:** HIGH
**Location:** `updateBattleScore()` lines 19267-19269

**Problem:**
```javascript
const newTotal = (participant?.score || 0) + score;
await db.ref(...).set(newTotal);
```

This ADDS to total every time, even if dailyScores is overwritten.

**Scenario:**
1. Log Wordle 3/6 → total = 25
2. Log Wordle again (conflict replace to 2/6) → total = 25 + 28 = 53 ❌

**Fix Required:**
Calculate total from dailyScores instead of incrementing:
```javascript
// After setting dailyScore, recalculate total from all dailyScores
const dailyScoresRef = db.ref(`battles/${battle.id}/participants/${currentUser.uid}/dailyScores`);
const snapshot = await dailyScoresRef.once('value');
const allScores = snapshot.val() || {};
const newTotal = Object.values(allScores).reduce((sum, s) => sum + (s || 0), 0);
await db.ref(...).set(newTotal);
```

---

### BUG 3: Race Condition in Score Updates
**Severity:** HIGH
**Location:** `updateBattleScore()` lines 19267-19269

**Problem:**
Non-atomic read-modify-write can lose updates when multiple games logged quickly.

**Fix Required:**
Use Firebase `transaction()` or `ServerValue.increment()`:
```javascript
// Option 1: ServerValue.increment (preferred)
await db.ref(`battles/${battle.id}/participants/${currentUser.uid}/score`)
  .set(firebase.database.ServerValue.increment(score));

// Option 2: Transaction
await db.ref(...).transaction(currentTotal => (currentTotal || 0) + score);
```

**But Note:** This conflicts with BUG 2 fix. Better solution is to always recalculate from dailyScores.

---

### BUG 4: Prize Pool Wrong for Token Battles
**Severity:** HIGH
**Location:** `completeBattle()` line 18509

**Current:**
```javascript
const prizePool = (battle.entryFee || 0) * participants.length;
```

**Fix Required:**
```javascript
const stakeAmount = battle.stakeAmount || battle.entryFee || 0;
const prizePool = stakeAmount * participants.length;
const prizeType = battle.stakeType || (battle.entryFee > 0 ? 'coins' : 'friendly');
```

---

### BUG 5: Winner Always Gets Tokens
**Severity:** HIGH
**Location:** `completeBattle()` line 18548

**Current:**
```javascript
appData.wallet.tokens = (appData.wallet?.tokens || 0) + winnerPrize;
```

**Fix Required:**
```javascript
if (prizeType === 'coins') {
    appData.wallet.coins = (appData.wallet?.coins || 0) + myPrize;
} else if (prizeType === 'tokens') {
    appData.wallet.tokens = (appData.wallet?.tokens || 0) + myPrize;
}
```

---

### BUG 6: daysPlayed Never Updated
**Severity:** LOW
**Location:** Participant tracking

**Problem:**
`daysPlayed` is initialized to 0 but never incremented when user plays games.

**Fix Required:**
In `updateBattleScore()`, track unique days:
```javascript
// Check if this is a new day for this battle
const existingDays = Object.keys(participant?.dailyScores || {})
    .map(key => key.split('_')[0])
    .filter((v, i, a) => a.indexOf(v) === i);
const newDayCount = new Set([...existingDays, today]).size;
await db.ref(`battles/${battle.id}/participants/${currentUser.uid}/daysPlayed`).set(newDayCount);
```

---

## Missing Features

### MISSING 1: Battle Reminders
**Severity:** MEDIUM

**Problem:**
No notification when user hasn't played battle games today.

**Suggested Implementation:**
- On app load, check active battles
- For each battle, check if all required games played today
- If not, show banner: "⚔️ You haven't played Wordle for 'Weekend Warriors' today!"

**Location to add:** After `loadUserBattles()` in init

---

### MISSING 2: Battle Impact in Success Modal
**Severity:** LOW

**Problem:**
There's HTML for `battle-impact-card` but need to verify it's shown.

**Check:** Search for where `battle-impact-card` is displayed.

---

### MISSING 3: Score Conflict → Battle Update
**Severity:** MEDIUM

**Problem:**
When user replaces score via conflict resolution, battle scores are not updated.

**Fix Required:**
In `resolveScoreConflict('replace')`, after updating local data:
```javascript
// Recalculate battle score for this game
updateBattleScore(gameId, result.numericScore || 0);
```

Wait, this would ADD again. Need to fix BUG 2 first.

---

## Testing Checklist for Beta

### Pre-Release Tests

- [ ] **Create battle with coins** - Verify coins deducted
- [ ] **Create battle with tokens** - Verify tokens deducted  
- [ ] **Create friendly battle** - Verify no deduction
- [ ] **Join coin battle** - Verify coins deducted
- [ ] **Join token battle** - Verify tokens deducted
- [ ] **Public battle creation** - Should force friendly
- [ ] **Log game in active battle** - Score should update
- [ ] **Log same game twice** - Score should NOT double
- [ ] **Log multiple games quickly** - All scores should be counted
- [ ] **Battle completion** - Winner gets correct currency back
- [ ] **Solo battle completion** - No prize awarded
- [ ] **Battle type: Wins** - Check 1 pt per win (WILL FAIL - bug)
- [ ] **Battle type: Perfect** - Check 1 pt per perfect (WILL FAIL - bug)

### Monitoring During Beta

- [ ] Watch Firebase for score anomalies (scores > reasonable maximum)
- [ ] Check for prize pool mismatches
- [ ] Monitor for duplicate dailyScore entries with same date

---

## Recommended Priority Fixes

### P0 - Fix Before Beta
1. **BUG 2**: Double-counting on score updates (recalculates from dailyScores) ✅ FIXED
2. **BUG 4 + 5**: Prize pool and winner payment for tokens ✅ FIXED
3. **BUG 1**: Battle type scoring not applied ✅ FIXED (server-side Firebase trigger)

### P1 - Fix Soon After Beta
4. **BUG 3**: Race condition ✅ FIXED (Firebase transactions)
5. **MISSING 3**: Score conflict → battle update ✅ FIXED

### P2 - Nice to Have
6. **BUG 6**: daysPlayed tracking ✅ FIXED
7. **MISSING 1**: Battle reminders ✅ FIXED

---

## Quick Verification Commands

```javascript
// Check a battle's data structure in Firebase Console
firebase.database().ref('battles/battle_XXXX').once('value').then(s => console.log(s.val()))

// Check if dailyScores match total
const battle = ...; // get battle data
const participant = battle.participants['USER_UID'];
const calculatedTotal = Object.values(participant.dailyScores || {}).reduce((s, v) => s + v, 0);
console.log('Stored:', participant.score, 'Calculated:', calculatedTotal, 'Match:', participant.score === calculatedTotal);
```
