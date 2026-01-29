# Game Shelf Help Reference v1.0

**Document Version:** 1.0  
**App Version:** 1.3.2  
**Last Updated:** January 29, 2026  
**Purpose:** Comprehensive reference for FAQ generation and AI help assistant

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Core Concepts](#2-core-concepts)
3. [Recording Games](#3-recording-games)
4. [Your Game Shelf](#4-your-game-shelf)
5. [Streaks & Stats](#5-streaks--stats)
6. [AI Hints](#6-ai-hints)
7. [Battles (Brain Battles)](#7-battles-brain-battles)
8. [Social Features](#8-social-features)
9. [Sharing](#9-sharing)
10. [Economy (Tokens & Coins)](#10-economy-tokens--coins)
11. [Achievements](#11-achievements)
12. [Rewards Shop](#12-rewards-shop)
13. [Account & Sync](#13-account--sync)
14. [Settings & Preferences](#14-settings--preferences)
15. [Troubleshooting](#15-troubleshooting)
16. [Supported Games](#16-supported-games)
17. [Limitations & Known Issues](#17-limitations--known-issues)

---

## 1. Quick Start

### What is Game Shelf?

Game Shelf is a free app that tracks your daily puzzle game results in one place. Instead of keeping mental notes of your Wordle streaks or Connections scores, Game Shelf automatically captures and organizes everything.

### Getting Started in 3 Steps

1. **Add games to your shelf** - Browse the Games tab, tap games you play daily
2. **Play your games** - Tap any game card to open it in browser/app
3. **Record your results** - Copy the share text from the game, return to Game Shelf, tap "Record Game"

### First-Time Setup

When you first open Game Shelf:
- You'll see a welcome screen with popular games
- Select at least one game to continue
- Optionally sign in with Google to sync across devices

---

## 2. Core Concepts

### Games vs. Your Shelf

- **Games Catalog**: All 34+ games Game Shelf supports (Games tab → Browse)
- **Your Shelf**: The games YOU track (Games tab → Your Shelf)
- You only see stats for games on your shelf

### Daily Play Cycle

Most puzzle games reset at midnight (usually midnight Eastern US time). Game Shelf tracks:
- Whether you've played today (checkmark on game card)
- Your result/score for today
- Your streak (consecutive days played)

### Local vs. Cloud Data

- **Not signed in**: Data stored on device only. Lost if you clear browser data or switch devices.
- **Signed in with Google**: Data synced to cloud. Access from any device.

---

## 3. Recording Games

### How to Record a Game Result

**Method 1: Clipboard (Recommended)**
1. Complete your game (e.g., Wordle)
2. Tap the game's share button to copy results to clipboard
3. Return to Game Shelf
4. Tap "Record Game" button (or tap the game card)
5. Game Shelf reads clipboard and logs automatically

**Method 2: Manual Entry**
1. Long-press (hold) the "Record Game" button
2. Select the game from the dropdown
3. Enter your score manually
4. Tap "Log Game"

### What Counts as a "Share Text"?

Each game has a specific format. Examples:

- **Wordle**: "Wordle 1,234 3/6" with colored squares
- **Connections**: "Connections Puzzle #567" with colored squares
- **Mini**: "The Mini January 29, 2026 0:45"

Game Shelf recognizes 82+ different share text patterns.

### Recording Multiple Games at Once

If you copy multiple game results (e.g., from a text message with several), Game Shelf can parse them all at once.

### Score Conflicts

If you try to record the same game twice in one day:
- A dialog appears asking: Keep original or Replace?
- Choose "Replace" to update with new score
- Choose "Keep" to ignore the new result

### When Recording Fails

Common reasons:
- Clipboard empty (copy the share text first)
- Game not supported (check supported games list)
- Wrong format (some games have multiple share formats)
- iOS permission denied (tap "Paste" when prompted)

---

## 4. Your Game Shelf

### Adding Games

1. Go to Games tab
2. Scroll down to "Browse All Games"
3. Tap any game to add it to your shelf
4. Or use Search to find specific games

### Removing Games

1. Long-press (hold) any game card
2. Select "Remove from Shelf"
3. Confirm removal

**Note**: Removing a game does NOT delete your history or stats for that game. If you re-add it later, your data returns.

### Game Categories

Games are organized by type:
- **NYT Games**: Wordle, Connections, Strands, Mini, Spelling Bee, Letterboxed
- **LinkedIn Games**: Queens, Tango, Pinpoint, Crossclimb, Zip
- **Word Games**: Quordle, Octordle, Waffle, Nerdle, etc.
- **Geography**: Worldle, Globle, Tradle, WhereTaken, etc.
- **Entertainment**: Framed, Actorle, Moviedle, Heardle, Bandle
- **Game Shelf Originals**: Quotle, Slate, Rungs, Word Boxing

### Quick Games (Home Screen)

The emoji buttons on the Home screen are shortcuts to your first 6 games. Tap to play, long-press for options.

### Game Recommendations

Game Shelf suggests new games based on what you already play. Tap the refresh icon for different suggestions.

---

## 5. Streaks & Stats

### How Streaks Work

A **streak** is consecutive days playing the same game.

- Play Wordle Monday → Streak = 1
- Play Wordle Tuesday → Streak = 2
- Miss Wednesday → Streak resets to 0
- Play Thursday → Streak = 1 (starts over)

**Important**: Streaks are per-game, not overall. Your Wordle streak is separate from your Connections streak.

### When Do Streaks Reset?

Your streak resets if you don't play by the end of the day (midnight your local time). 

**Timezone note**: The game itself might reset at a different time (e.g., Wordle resets at midnight Eastern), but Game Shelf uses YOUR local time for streak tracking.

### Stats Explained

For each game, Game Shelf tracks:

| Stat | Meaning |
|------|---------|
| Games Played | Total number of times you've logged this game |
| Current Streak | Consecutive days played (resets if you miss a day) |
| Max Streak | Your longest streak ever for this game |
| Win Rate | Percentage of games won (where applicable) |
| Average Score | Average performance (varies by game) |

### Viewing Your Stats

- **Stats Tab**: Overview of all games
- **Game Card**: Shows streak and today's status
- **Long-press → Stats**: Detailed stats for one game

### History

Your complete play history is stored in Stats → History. Filter by game or date range.

---

## 6. AI Hints

### What Are AI Hints?

Game Shelf can give you hints for supported games using AI. Hints range from subtle nudges to direct answers.

### Supported Games for Hints

| Game | Hint Source |
|------|-------------|
| Connections | Web search for today's puzzle |
| Wordle | Web search for today's word |
| Strands | Web search for today's puzzle |
| Spelling Bee | Web search for today's answers |
| Mini | Web search for today's puzzle |
| Quotle | Local puzzle data |
| Rungs | Local puzzle data |
| Slate | Local puzzle data |

### Hint Levels

| Level | Name | What You Get |
|-------|------|--------------|
| 1 | Whisper | Extremely vague, barely helpful |
| 2 | Murmur | Very subtle nudge |
| 3 | Hint | Light guidance |
| 4 | Nudge | Clearer direction (default) |
| 5 | Guide | Helpful pointer |
| 6 | Assist | More specific help |
| 7 | Help | Direct assistance |
| 8 | Reveal | Significant spoiler |
| 9 | Spoiler | Major reveal |
| 10 | Answer | Full solution |

### Using Hints

1. Tap the lightbulb (💡) icon in the header or floating button
2. Select which game you need help with
3. Adjust hint level slider
4. Tap "Get Hint"
5. Read hint in the response area

### Hint Cost

Each hint costs **5 tokens**. See Economy section for how to earn tokens.

### Hint Rate Limits

- **Per hour**: 20 hints maximum
- **Per day**: 50 hints maximum

Limits reset at midnight (your local time for daily, rolling for hourly).

### Requirements

- Must be signed in with Google account
- Must have sufficient tokens (5 per hint)

---

## 7. Battles (Brain Battles)

### What Are Battles?

Battles are competitions between 2+ players over multiple days. Everyone plays the same games, and scores are compared.

### Creating a Battle

1. Go to Hub tab → Battles → "Create Battle"
2. Name your battle
3. Select games (1-8 games)
4. Choose duration (1-30 days)
5. Select battle type
6. Choose stakes (Friendly, Coins, or Tokens)
7. Set visibility (Private or Public)
8. Tap "Create Battle"

### Battle Types

| Type | How Scoring Works |
|------|-------------------|
| **Total Score** | Your raw scores from each game add up. Higher = better. |
| **Most Wins** | Each game you WIN = 1 point. Losses don't hurt you. |
| **Perfect Hunter** | Only PERFECT scores count. Perfect = 1 point. |
| **Streak Challenge** | Daily completion = +10 bonus. Miss a day = lose all bonuses. |

### What Counts as "Perfect"?

- Wordle: 1/6 or 2/6
- Connections: 0 mistakes (all 4 groups correct first try)
- Strands: 0 hints used
- Mini: Under 30 seconds
- Quordle: All 4 words, no fails

### Stakes

| Stake Type | Entry | Winner Gets |
|------------|-------|-------------|
| Friendly | Free | Bragging rights |
| Coins | 1-5 coins | 80% of prize pool |
| Tokens | 1-500 tokens | 80% of prize pool |

**Note**: Public battles are always Friendly (no stakes).

### Joining a Battle

**By Code**: Enter the 6-character join code
**By Link**: Click a battle invite link
**From Lobby**: Browse public battles in Hub → Battles → Public Battles

### During a Battle

- Play the selected games as usual
- Your scores automatically count toward the battle
- Check standings in Hub → Battles → [Your Battle]
- Home screen shows battle reminder widget

### Battle Reminders

If you haven't played all battle games today, the Home screen shows: "⚠️ Still to play: Wordle, Connections"

### Battle Completion

Battles end at midnight (Eastern time) on the final day. Winners are determined by the battle type scoring, and prizes are automatically distributed.

---

## 8. Social Features

### Adding Friends

**By Friend Code**:
1. Hub tab → Friends → "Add Friend"
2. Enter their 8-character friend code
3. Tap "Add"

**By Link**:
1. Share your friend link (Hub → Friends → Share Link)
2. They tap the link and you're connected

**From Contacts** (iOS/Android):
1. Hub → Friends → "Find Friends"
2. Grant contact access
3. Game Shelf checks if any contacts use the app

### Your Friend Code

Find your unique 8-character code in Hub → Friends. Share it with others so they can add you.

### Friends Widget (Home Screen)

Shows your friends' play status for today:
- ✓ = played today
- ... = hasn't played yet

Tap a friend to see their profile.

### Friend Profiles

View any friend's:
- Games played today
- Current streaks
- Recent activity

### Nudging Friends

If a friend hasn't played today, you can send them a nudge:
1. Tap their avatar
2. Tap "👋 Nudge to Play"
3. They'll see a notification next time they open Game Shelf

**Limit**: One nudge per friend per day.

### Leaderboards

See how you rank against friends:
- Daily: Today's games played
- Weekly: This week's total
- Monthly: This month's total

Access via Hub → Friends → Leaderboard.

### Referral Program

Invite friends to earn rewards:

| Milestone | Reward |
|-----------|--------|
| Friend signs up | 10 tokens |
| Friend plays 7 days | 25 tokens |
| Friend plays 30 days | 50 tokens |

Share your referral link in Hub → Friends → Invite Friends.

---

## 9. Sharing

### Share Tab

The Share tab lets you share today's results to social media.

### Share Templates

| Template | Style |
|----------|-------|
| Default | Neutral recap of games played |
| Brag | "Crushed it today!" language |
| Humble | Modest, understated |
| Streak | Emphasizes your streaks |
| Challenge | Invites others to beat your scores |
| Minimal | Single line, bare facts |

### Supported Platforms

- Twitter/X (with hashtags)
- Threads
- BlueSky
- Mastodon
- Reddit
- Discord
- Facebook
- LinkedIn
- SMS/Messages
- Copy to clipboard

### Image Cards

Create a visual card of your results:
1. Share tab → "Create Image"
2. Choose style (Default, Dark, Gradient, Minimal)
3. Choose format (Landscape or Story)
4. Download or share directly

### Weekly Recap

Generate a summary of your week:
- Total games played
- Days active
- Win rate
- Top games

Access via Share tab → "Weekly Recap"

### Share History

Your last 20 shares are saved. Reuse or modify previous messages.

---

## 10. Economy (Tokens & Coins)

### Tokens vs. Coins

| Currency | How to Get | What It's For |
|----------|------------|---------------|
| **Tokens** | Free - earned through play | AI hints, token battles |
| **Coins** | Purchase with real money | Coin battles, rewards shop |

### Earning Tokens

| Action | Tokens |
|--------|--------|
| New account | 50 tokens (starting bonus) |
| Complete 5+ games in a day | 5 tokens |
| 5-day streak (any game) | 10 tokens |
| Play all GS Original games in a day | 5 tokens |
| Win a battle | Varies (from prize pool) |
| Referrals | 10-50 tokens per milestone |

### Buying Coins

1. Hub → Wallet → "Buy Coins"
2. Select package
3. Complete purchase via Stripe

Coin packages vary by region. Coins never expire.

### Viewing Your Balance

- Home screen: Wallet widget shows current balance
- Menu → Wallet: Full wallet details
- Header: Token count visible at all times

### Transaction History

View all token/coin activity:
Menu → Wallet → "Transaction History"

---

## 11. Achievements

### What Are Achievements?

Achievements are milestones that unlock as you use Game Shelf. They're displayed in your profile and achievement gallery.

### Achievement List

| Achievement | Name | How to Unlock |
|-------------|------|---------------|
| 👶 | First Steps | Log your first game |
| 🎩 | Hat Trick | 3-day streak |
| ⚔️ | Week Warrior | 7-day streak |
| 👑 | Monthly Master | 30-day streak |
| 📚 | Collector | Track 5 different games |
| 🎮 | Enthusiast | Track 10 different games |
| 🌱 | Getting Started | Complete 10 games total |
| 💪 | Dedicated | Complete 50 games total |
| 🏛️ | Centurion | Complete 100 games total |
| 🐦 | Early Bird | Log a game before 7 AM |
| 🦉 | Night Owl | Log a game after 11 PM |
| 🦋 | Social Butterfly | Share your results |
| ☁️ | Cloud Gamer | Sign in and sync |
| ⚔️ | Challenger | Join a Brain Battle |

### Viewing Achievements

Menu → Achievements

Shows progress bar and which achievements you've unlocked.

---

## 12. Rewards Shop

### What Is the Rewards Shop?

Spend coins on virtual and physical rewards.

### Virtual Rewards

- Custom themes
- Special badges
- Profile decorations

### Physical Rewards (Gift Tiers)

At certain coin thresholds, you can redeem physical gifts:
- Stickers
- Mugs
- T-shirts
- Premium items

**Note**: Physical rewards require shipping information and may take 2-4 weeks to arrive.

### Accessing the Shop

Menu → Rewards Shop

---

## 13. Account & Sync

### Why Sign In?

| Feature | Without Sign-In | With Sign-In |
|---------|-----------------|--------------|
| Track games | ✓ | ✓ |
| Streaks & stats | ✓ | ✓ |
| Friends | ✗ | ✓ |
| Battles | ✗ | ✓ |
| AI Hints | ✗ | ✓ |
| Leaderboards | ✗ | ✓ |
| Multi-device sync | ✗ | ✓ |
| Data backup | ✗ | ✓ |

### How to Sign In

1. Menu → Account → "Sign In"
2. Tap "Sign in with Google"
3. Select your Google account
4. Done! Data syncs automatically.

### Signing Out

Menu → Account → "Sign Out"

**Warning**: If you sign out without syncing, local-only data may be lost.

### Data Sync

When signed in:
- Data syncs automatically after each game
- Manual sync: Pull down to refresh on any screen
- Sync status shown in Account section

### Switching Devices

1. Sign in with same Google account on new device
2. Your data loads automatically

### Privacy

- Game Shelf only stores puzzle stats, not personal info beyond your Google profile
- Your data is private by default
- Friends can only see what you share (leaderboard rankings, profile)
- You can delete your account anytime

---

## 14. Settings & Preferences

### Accessing Settings

Menu → Settings & Data

### Available Settings

| Setting | Description |
|---------|-------------|
| **Dark Mode** | Auto (follows system), Always On, Always Off |
| **Sound Effects** | Toggle game sounds on/off |
| **Sound Customizer** | Choose different sounds for events |
| **Daily Goal** | Set target games per day (affects progress ring) |
| **Launch Preference** | Open games in browser or app (for NYT, LinkedIn) |
| **Notifications** | Enable/disable push notifications |

### Sound Customizer

Customize sounds for:
- Game logged successfully
- Achievement unlocked
- Streak milestone
- Battle events
- Coin/token earned

### Developer Settings

Hidden settings for testing (only visible if enabled):
- Test Mode toggle
- Clear cache
- Reset data

---

## 15. Troubleshooting

### Streaks Not Updating

**Symptoms**: Played today but streak shows 0 or didn't increment

**Causes & Fixes**:
1. **Didn't actually record the game** - Check history. If game not there, record it.
2. **Timezone issue** - If you played close to midnight, it might have counted for wrong day
3. **Missed a day** - Streaks reset if you miss ANY day

### Game Not Recognized

**Symptoms**: Pasted share text but Game Shelf says "couldn't recognize"

**Causes & Fixes**:
1. **Game not supported** - Check supported games list
2. **Wrong format** - Some games have multiple share formats; try the standard one
3. **Extra text** - Remove any text you added before/after the share text
4. **Clipboard empty** - Make sure you actually copied the text

### Clipboard Not Working (iOS)

**Symptoms**: Tap Record Game but nothing happens

**Causes & Fixes**:
1. **Permission denied** - When iOS asks "Allow Paste?", tap "Allow"
2. **Clipboard empty** - Go back to game and copy share text again
3. **Use manual entry** - Long-press Record Game button instead

### Sync Issues

**Symptoms**: Data different between devices, or not saving

**Causes & Fixes**:
1. **Not signed in** - Check Account section
2. **Poor connection** - Wait for better network
3. **Sign out and back in** - Sometimes fixes stuck sync
4. **Check for errors** - Look for error toasts

### Sound Not Working

**Symptoms**: No sounds even though enabled

**Causes & Fixes**:
1. **Device muted** - Check your phone's mute switch / volume
2. **Browser permissions** - Some browsers block auto-play; tap anywhere first
3. **Sound setting off** - Check Settings → Sound Effects

### App Running Slowly

**Causes & Fixes**:
1. **Too much history** - Very old accounts with years of data may be slow
2. **Clear cache** - Settings → Developer → Clear Cache
3. **Reinstall PWA** - Remove from home screen, re-add

### Lost Data

**If signed in**: Data should be in cloud. Try signing out and back in.

**If not signed in**: Data stored locally only. Clearing browser data or switching devices loses it. This cannot be recovered.

**Prevention**: Always sign in to keep data backed up.

---

## 16. Supported Games

### Full Game List (34 games)

**NYT Games** (6):
| Game | Icon | Has App |
|------|------|---------|
| Wordle | 🟩 | Yes |
| Connections | 🔗 | Yes |
| Strands | 🧵 | Yes |
| Mini | 📝 | Yes |
| Spelling Bee | 🐝 | Yes |
| Letterboxed | 📦 | Yes |

**LinkedIn Games** (5):
| Game | Icon | Has App |
|------|------|---------|
| Queens | 👑 | Yes |
| Tango | 💃 | Yes |
| Pinpoint | 📍 | Yes |
| Crossclimb | 🧗 | Yes |
| Zip | ⚡ | Yes |

**Word Games** (8):
| Game | Icon |
|------|------|
| Quordle | 4️⃣ |
| Octordle | 8️⃣ |
| Waffle | 🧇 |
| Redactle | █ |
| Semantle | 🧠 |
| Nerdle | 🧮 |
| Contexto | 🎯 |
| Dordle | 2️⃣ |

**Geography** (6):
| Game | Icon |
|------|------|
| Worldle | 🌍 |
| Globle | 🌎 |
| Tradle | 🚢 |
| WhereTaken | 📸 |
| FoodGuessr | 🍕 |
| Travle | ✈️ |

**Entertainment** (5):
| Game | Icon |
|------|------|
| Framed | 🎬 |
| Actorle | 🎭 |
| Moviedle | 🎥 |
| Heardle | 🎵 |
| Bandle | 🎸 |

**Sports & Misc** (2):
| Game | Icon |
|------|------|
| Immaculate Grid | ⚾ |
| Costcodle | 🛒 |

**Game Shelf Originals** (4):
| Game | Icon | Description |
|------|------|-------------|
| Quotle | 💬 | Guess the famous quote |
| Slate | 📝 | Word puzzle on a chalkboard |
| Rungs | 🪜 | Word ladder game |
| Word Boxing | 🥊 | Head-to-head word battle |

### Requesting New Games

Menu → Help & About → Suggest a Game

Include:
- Game name
- URL
- Sample share text

---

## 17. Limitations & Known Issues

### What Game Shelf Can't Do

| Limitation | Reason |
|------------|--------|
| Auto-detect when you play a game | Privacy - we don't track your browsing |
| Pull scores directly from games | Games don't provide APIs |
| Track games without share text format | No way to parse score |
| Sync with other tracking apps | No standard data format |
| Work offline for cloud features | Requires internet for sync/hints/battles |

### Known Issues (v1.3.2)

| Issue | Status | Workaround |
|-------|--------|------------|
| Some NYT games have multiple share formats | Working on more parsers | Use standard share button |
| Streak might show wrong right after midnight | Refresh the app | Pull down to refresh |
| PWA install banner can be annoying | Dismissed for 7 days | Close it, won't show again soon |

### Platform-Specific Notes

**iOS Safari**:
- Clipboard requires permission each time (iOS security)
- PWA works but some gestures different
- "Add to Home Screen" from Share menu

**Android Chrome**:
- Best experience as installed PWA
- Notifications work when installed
- "Install" prompt appears automatically

**Desktop**:
- All features work
- Right-click game cards for options (instead of long-press)
- Clipboard works automatically

### Data Limits

- Game history: Unlimited (but old entries may slow app)
- Friends: 500 maximum
- Active battles: 10 maximum
- Share history: Last 20 entries

### Rate Limits

| Feature | Limit |
|---------|-------|
| AI hints (hourly) | 20 |
| AI hints (daily) | 50 |
| Nudges per friend | 1 per day |
| Sync frequency | Once per minute |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Shelf** | Your personal collection of tracked games |
| **Streak** | Consecutive days playing the same game |
| **Battle** | Multi-day competition between players |
| **Token** | Free currency earned through play |
| **Coin** | Purchased currency for premium features |
| **Nudge** | Friendly reminder sent to a friend |
| **PWA** | Progressive Web App - installable website |
| **Share text** | The result text games let you copy/share |

---

## Appendix B: Scoring Reference (Battles)

### Wordle Scoring
| Result | Points |
|--------|--------|
| 1/6 | 50 (hole-in-one) |
| 2/6 | 30 |
| 3/6 | 22 |
| 4/6 | 15 |
| 5/6 | 10 |
| 6/6 | 6 |
| X/6 (fail) | 0 |

### Connections Scoring
| Mistakes | Points |
|----------|--------|
| 0 | 30 |
| 1 | 24 |
| 2 | 18 |
| 3 | 12 |
| 4 (fail) | 0 |

### Strands Scoring
| Hints Used | Points |
|------------|--------|
| 0 | 28 |
| 1 | 25 |
| 2 | 22 |
| 3+ | 19 |

### Mini Scoring
| Time | Points |
|------|--------|
| <45s | 28 |
| 45s-1m | ~24 |
| 1m-2m | ~18 |
| >2m | 12 (floor) |

### Quotle (GS Original) Scoring
| Result | Points |
|--------|--------|
| 1/4 | 50 (hole-in-one) |
| 2/4 | 30 |
| 3/4 | 20 |
| 4/4 | 12 |

---

## Document Maintenance

This document should be updated when:
- New features are added
- Existing features change significantly  
- New games are supported
- User-reported confusion patterns emerge
- Version major/minor increments

**Update checklist**:
- [ ] Update "App Version" at top
- [ ] Update "Last Updated" date
- [ ] Add/modify relevant sections
- [ ] Update Table of Contents if sections added
- [ ] Review Troubleshooting for outdated info
- [ ] Check Limitations section for resolved issues
