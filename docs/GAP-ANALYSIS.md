# Gap Analysis - Help Documentation Project

**Checkpoint:** 1.3  
**Date:** January 29, 2026  
**Status:** ✅ Complete

---

## Overview

This analysis compares the current FAQ (48 questions) and system prompt against the complete feature inventory from Checkpoint 1.1.

---

## FAQ Gap Analysis

### Current FAQ Categories (10)
| Category | Questions | Coverage |
|----------|-----------|----------|
| Getting Started | 4 | 🟡 Partial |
| Recording Games | 6 | 🟢 Good |
| Streaks & Stats | 5 | 🟡 Partial |
| AI Hints | 5 | 🟢 Good |
| Battles | 4 | 🟡 Partial |
| Friends | 5 | 🟢 Good |
| Tokens & Coins | 4 | 🟡 Partial |
| Account & Sync | 4 | 🟢 Good |
| Troubleshooting | 6 | 🟡 Partial |
| Privacy & Data | 3 | 🟢 Good |

**Total: 48 questions**  
**Target: 100+ questions**

### Missing FAQ Categories (Need to Add)

| Category | Priority | Why Needed |
|----------|----------|------------|
| **Navigation** | HIGH | Users ask "where is X" constantly |
| **AI Help** | HIGH | Different from hints, users confused |
| **Share Tab** | MEDIUM | 3 subtabs with distinct functions |
| **Home Screen** | MEDIUM | Quick buttons, Tap to Log, progress widget |
| **Achievements** | LOW | Feature exists but undocumented |
| **Rewards** | LOW | Shop + referrals need coverage |

### Missing Questions by Existing Category

**Getting Started (add 4-6)**
- [ ] How do I install Game Shelf?
- [ ] What's the difference between the app and website?
- [ ] Can I use Game Shelf offline?
- [ ] How do I find a specific feature?
- [ ] What do the icons mean?

**Recording Games (add 3-4)**
- [ ] What is Tap to Log?
- [ ] How does clipboard detection work?
- [ ] Why do I see "Allow Paste" on iPhone?
- [ ] Can I record old games (past dates)?

**Streaks & Stats (add 5-6)**
- [ ] How do I import my stats? *(HIGH PRIORITY)*
- [ ] What's the Overview vs By Game subtab?
- [ ] What is average score?
- [ ] Why is my streak different than Wordle shows?
- [ ] Can I reset my stats?
- [ ] How do I see stats for a specific game?

**Battles (add 6-8)**
- [ ] What are the battle types? (Total Score, Most Wins, etc.)
- [ ] How does scoring work in battles?
- [ ] Can I leave a battle?
- [ ] What happens if I miss a day during a battle?
- [ ] How do token/coin stakes work?
- [ ] Can I create a private battle?
- [ ] How many people can join a battle?
- [ ] What happens when a battle ends?

**Tokens & Coins (add 4-5)**
- [ ] What's in the Rewards Shop?
- [ ] How does the referral program work?
- [ ] Do tokens/coins expire?
- [ ] How do I give tokens to a friend?
- [ ] What are streak milestones?

**Troubleshooting (add 6-8)**
- [ ] AI hints not working
- [ ] AI Help giving wrong answers
- [ ] Can't create a battle
- [ ] Friend code not working
- [ ] Notifications not showing
- [ ] PWA won't install
- [ ] How do I report a bug?
- [ ] How do I reinstall the app?

---

## System Prompt Gap Analysis

### What's Covered Well ✅
- Basic navigation (tabs, subtabs)
- Create Battle flow
- Add Friend flow
- Get Hint flow
- Record Game flow
- Import Stats flow *(recently added)*
- Navigation actions (30+ actions)
- Few-shot examples
- Boundaries

### What's Missing ❌

**HIGH Priority (Frequently Asked)**

| Topic | Gap | Impact |
|-------|-----|--------|
| Menu Structure | No coverage of Wallet, Account, My Games, Rewards, Help, Settings, Advanced menus | Users can't find features |
| Home Screen | No Quick Game Buttons, Tap to Log, Progress Widget | Users miss key features |
| Share Tab Details | Doesn't explain Today vs Compose vs History | Confusing 3 subtabs |
| Battle Types | Lists "Total Score" but doesn't explain scoring formulas | Users confused about scoring |
| Game Card Anatomy | No long-press menu docs | Users don't know options |

**MEDIUM Priority (Common Questions)**

| Topic | Gap | Impact |
|-------|-----|--------|
| Activity Feed | Not mentioned at all | Users don't know it exists |
| Achievements | Not mentioned | Hidden feature |
| Rewards Shop | No details on items/costs | Users can't spend coins |
| Referral Program | Not mentioned | Users miss free tokens |
| Settings Details | No Theme, Sound, Notifications | Can't customize |

**LOW Priority (Edge Cases)**

| Topic | Gap | Impact |
|-------|-----|--------|
| Advanced Section | Force update, Reset data, Developer options | Power user features |
| Keyboard Shortcuts | Desktop users | Desktop minority |
| PWA Installation | Install process | One-time action |

### Action Buttons Missing

Current actions are good, but could add:
- `showTutorial` - Restart tutorial
- `showAchievements` - View achievements  
- `showReferral` - Referral program
- `showSettings` - Open settings

---

## Comparison Matrix

| Feature Area | In FAQ? | In Prompt? | In V2 Outline? | Priority |
|--------------|---------|------------|----------------|----------|
| App Overview | Partial | Partial | ✅ | HIGH |
| Home Screen | ❌ | ❌ | ✅ | HIGH |
| Quick Game Buttons | ❌ | ❌ | ✅ | HIGH |
| Tap to Log | ❌ | ❌ | ✅ | HIGH |
| Games Tab | Partial | Partial | ✅ | MEDIUM |
| Long-press Menu | ❌ | Partial | ✅ | HIGH |
| Recording Games | ✅ | ✅ | ✅ | - |
| Import Stats | ❌ | ✅ | ✅ | HIGH |
| Stats Tab | Partial | Partial | ✅ | MEDIUM |
| Streaks | ✅ | ✅ | ✅ | - |
| AI Hints | ✅ | ✅ | ✅ | - |
| AI Help | ❌ | ❌ | ✅ | HIGH |
| Battles | Partial | Partial | ✅ | MEDIUM |
| Battle Types | ❌ | ❌ | ✅ | HIGH |
| Friends | ✅ | Partial | ✅ | - |
| Activity Feed | ❌ | ❌ | ✅ | MEDIUM |
| Share Tab | ❌ | ❌ | ✅ | MEDIUM |
| Tokens & Coins | Partial | Partial | ✅ | MEDIUM |
| Rewards Shop | ❌ | ❌ | ✅ | LOW |
| Referrals | ❌ | ❌ | ✅ | MEDIUM |
| Achievements | ❌ | ❌ | ✅ | LOW |
| Account & Sync | ✅ | Partial | ✅ | - |
| Menu Structure | ❌ | ❌ | ✅ | HIGH |
| Settings | ❌ | ❌ | ✅ | LOW |
| Troubleshooting | Partial | Partial | ✅ | MEDIUM |
| Supported Games | ✅ | ✅ | ✅ | - |

---

## Summary Statistics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| FAQ Questions | 48 | 100+ | 52+ needed |
| FAQ Categories | 10 | 12-14 | 2-4 needed |
| Prompt Features | ~60% | 95% | ~35% missing |
| Action Buttons | 24 | 28+ | 4+ needed |

---

## Recommended Phase 2 Order

Based on impact and frequency, write HELP_REFERENCE_V2 sections in this order:

1. **Part 2: Home Screen** - Most visible, most asked
2. **Part 4: Recording Games** - Core function
3. **Part 6: Streaks** - Biggest pain point
4. **Part 7: AI Hints** - Monetization touch
5. **Part 8: AI Help** - Meta-help confusion
6. **Part 5: Stats Tab** - Including Import Stats
7. **Part 9: Battles** - Including battle types
8. **Part 3: Games Tab** - Navigation detail
9. **Part 10: Friends & Social** - Activity feed
10. **Part 11: Share Tab** - 3 subtabs
11. **Part 12: Economy** - Tokens, coins, shop
12. **Part 15: Settings & Menu** - Structure coverage
13. **Part 16: Troubleshooting** - Expand coverage
14. Remaining parts

---

## Next Steps

**Checkpoint 1.3 Complete ✅**

Ready for **Phase 2: Core Documentation**

Recommend starting with:
- Checkpoint 2.1: Navigation & Structure (Parts 1-3)
- Focus on Home Screen and Games Tab first

---
