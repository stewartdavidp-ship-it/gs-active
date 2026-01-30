# AI Help System Prompt v2.0 - Test Checklist

**Version:** 2.0  
**Created:** January 29, 2026  
**Purpose:** Manual testing checklist for validating AI Help responses after deployment

---

## How to Test

1. **Deploy** - Upload `firebase-functions/functions/index.js` to Command Center
2. **Wait** - GitHub Actions deploys to Firebase (~2-3 minutes)
3. **Open** - Game Shelf app → Menu → Help → AI Help
4. **Test** - Ask each question below, mark results
5. **Document** - Note any issues for prompt tuning

---

## Test Results Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass - Accurate, helpful response |
| ⚠️ | Partial - Mostly correct, minor issues |
| ❌ | Fail - Wrong info or unhelpful |
| 🔘 | Has action button (expected for "do" questions) |
| ○ | No action button (expected for "learn" questions) |

---

## Test Suite (30 Questions)

### Navigation & Menu (6 questions)
Test that the new menu structure documentation works.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 1 | "Where is my wallet?" | ☐ | ☐ 🔘 | Should say Menu → Wallet |
| 2 | "How do I get to settings?" | ☐ | ☐ ○ | Menu → Settings |
| 3 | "What's in the menu?" | ☐ | ☐ ○ | Should list all sections |
| 4 | "How do I find achievements?" | ☐ | ☐ 🔘 | Menu → My Games → Achievements |
| 5 | "Where is the activity feed?" | ☐ | ☐ 🔘 | Battles → Activity |
| 6 | "How do I access the rewards shop?" | ☐ | ☐ 🔘 | Menu → Rewards → Shop |

**Expected behaviors:**
- Q1, Q4, Q5, Q6 should have action buttons
- Q2, Q3 are informational, no action needed
- All should mention correct paths

---

### Home Screen (4 questions)
Test the new home screen documentation.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 7 | "What are the quick game buttons?" | ☐ | ☐ ○ | Emoji shortcuts, first 6 games |
| 8 | "What's on the home screen?" | ☐ | ☐ ○ | Should list layout |
| 9 | "How does tap to log work?" | ☐ | ☐ ○ | Clipboard detection, iOS Allow Paste |
| 10 | "What does the progress bar show?" | ☐ | ☐ ○ | X/Y games toward daily goal |

**Expected behaviors:**
- All informational, no actions expected
- Should explain Quick Game Buttons clearly
- Tap to Log should mention iOS permission

---

### Recording & Streaks (4 questions)
Core functionality that was already covered.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 11 | "How do I record a game?" | ☐ | ☐ ○ | Copy → Record Game → paste |
| 12 | "Why does iOS ask to allow paste?" | ☐ | ☐ ○ | iOS permission, must tap Allow |
| 13 | "How do streaks work?" | ☐ | ☐ ○ | Consecutive days, miss = reset |
| 14 | "Can I import my Wordle streak?" | ☐ | ☐ 🔘 | Stats → By Game → Import Stats |

**Expected behaviors:**
- Q14 should have action button (showImportStats)
- Q12 should explain iOS clipboard behavior

---

### Battles (5 questions)
Test the new battle type scoring documentation.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 15 | "How do I create a battle?" | ☐ | ☐ 🔘 | Steps + showCreateBattle |
| 16 | "What are the battle types?" | ☐ | ☐ 🔘 | List all 4 with descriptions |
| 17 | "How does streak challenge scoring work?" | ☐ | ☐ ○ | +10 bonus for ALL games daily |
| 18 | "How do I join a battle?" | ☐ | ☐ ○ | Link, code, or public battles |
| 19 | "What happens when a battle ends?" | ☐ | ☐ ○ | Winner determined, prizes |

**Expected behaviors:**
- Q16 should list all 4 types with emojis
- Q17 should explain the +10 daily bonus mechanic
- Q15, Q16 should have action buttons

---

### Share Tab (3 questions)
Test the new Share Tab subtab documentation.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 20 | "How do I share my results?" | ☐ | ☐ 🔘 | Multiple methods, switchShareTab |
| 21 | "What's in the share tab?" | ☐ | ☐ ○ | Today, Compose, History |
| 22 | "How do I share a weekly recap?" | ☐ | ☐ 🔘 | Share → Today → Weekly Recap |

**Expected behaviors:**
- Q21 should explain all 3 subtabs
- Q22 should have specific path

---

### Economy (3 questions)
Test tokens/coins documentation.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 23 | "What are tokens vs coins?" | ☐ | ☐ 🔘 | Tokens=free, Coins=purchased |
| 24 | "How do I earn tokens?" | ☐ | ☐ ○ | Play, streaks, referrals |
| 25 | "What's in the rewards shop?" | ☐ | ☐ 🔘 | Frames, themes, badges |

**Expected behaviors:**
- Clear distinction between tokens and coins
- Should mention starting 50 tokens

---

### AI Features (3 questions)
Test AI Help/Hints distinction.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 26 | "How do hints work?" | ☐ | ☐ ○ | 5 tokens, levels 1-10, 💡 icon |
| 27 | "What's the difference between AI Help and AI Hints?" | ☐ | ☐ ○ | Help=app, Hints=puzzles |
| 28 | "Why do I get 3 free follow-ups?" | ☐ | ☐ ○ | Multi-turn conversation |

**Expected behaviors:**
- Q27 should clearly distinguish the two
- Q28 should explain 5 tokens + 3 free model

---

### Troubleshooting (2 questions)
Test troubleshooting responses.

| # | Question | Pass | Action | Notes |
|---|----------|------|--------|-------|
| 29 | "Hints not working" | ☐ | ☐ ○ | Checklist: signed in, tokens, rate limit |
| 30 | "Game not recognized" | ☐ | ☐ ○ | Copy original, no modifications |

**Expected behaviors:**
- Q29 should give diagnostic checklist
- Q30 should explain clipboard requirements

---

## Summary

| Category | Total | Passed | Actions Expected | Actions Found |
|----------|-------|--------|------------------|---------------|
| Navigation & Menu | 6 | /6 | 4 | /4 |
| Home Screen | 4 | /4 | 0 | /0 |
| Recording & Streaks | 4 | /4 | 1 | /1 |
| Battles | 5 | /5 | 2 | /2 |
| Share Tab | 3 | /3 | 2 | /2 |
| Economy | 3 | /3 | 2 | /2 |
| AI Features | 3 | /3 | 0 | /0 |
| Troubleshooting | 2 | /2 | 0 | /0 |
| **TOTAL** | **30** | **/30** | **11** | **/11** |

---

## Issues Found

Document any problems here for Phase 6 tuning:

| # | Issue | Severity | Fix Needed |
|---|-------|----------|------------|
| | | | |
| | | | |
| | | | |

---

## Post-Test Actions

- [ ] If >25 pass: Move to Phase 5 (RAG Improvements)
- [ ] If 20-25 pass: Minor prompt tuning needed
- [ ] If <20 pass: Major prompt revision needed
- [ ] Document all issues in this file
- [ ] Update HELP-DOCS-PROJECT.md with results

---

## Simulated Test Results (Pre-Deployment)

Based on analysis of the v2.0 prompt against the test questions:

| Category | Expected Pass Rate | Confidence |
|----------|-------------------|------------|
| Navigation & Menu | 6/6 | HIGH - New menu structure documented |
| Home Screen | 4/4 | HIGH - New Quick Game Buttons, Tap to Log |
| Recording & Streaks | 4/4 | HIGH - Well covered |
| Battles | 5/5 | HIGH - New scoring formulas added |
| Share Tab | 3/3 | HIGH - New subtab documentation |
| Economy | 3/3 | MEDIUM - Good coverage |
| AI Features | 3/3 | HIGH - Clear distinction documented |
| Troubleshooting | 2/2 | HIGH - Checklist format |

**Predicted Overall:** 30/30 (100%) - Prompt has comprehensive coverage

**Key Improvements in v2.0:**
- Menu structure fully documented (was missing)
- Home screen features explained (Quick Game Buttons, Tap to Log)
- Share Tab subtabs documented (Today/Compose/History)
- Battle type scoring formulas included
- Settings and Advanced sections added
- 16 few-shot examples (was 8)

---

*Last Updated: January 29, 2026*
