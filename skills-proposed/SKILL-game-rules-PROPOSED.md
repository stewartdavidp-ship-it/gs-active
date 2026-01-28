---
name: game-rules
description: Game mechanics and rules for Quotle, Slate, Rungs, Word Boxing, and Game Shelf tracker. Reference for implementing features, fixing bugs, or understanding gameplay.
---

# Game Rules & Mechanics

## 🛑 IMPORTANT CONTEXT

When working on:
- **AI Hints**: Need to know game mechanics to give appropriate hints
- **Battle Scoring**: Need exact scoring formulas
- **Share Text Parsing**: Need to know expected formats
- **Stats Display**: Need to understand what metrics matter

---

## 🎮 GAME SHELF (Tracker App)

### Purpose
PWA for tracking daily puzzle games - aggregates stats across 30+ supported games.

### Key Features
| Feature | Description |
|---------|-------------|
| Share Text Parsing | Paste game results, auto-detect game and score |
| Streak Tracking | Per-game current and max streaks |
| Battle System | Compete with friends on daily games |
| AI Hints | 10-level hint system via Claude API |
| Friends & Leaderboards | Social features with Firebase |
| Token Economy | Earn/spend tokens for hints |

### Battle Scoring (v1.2.47)

**Core NYT Games:**
```javascript
// Wordle
const wordleScore = { 1: 50, 2: 30, 3: 22, 4: 15, 5: 10, 6: 6 };

// Connections (by mistakes)
const connectionsScore = { 0: 30, 1: 24, 2: 18, 3: 12 };

// Strands (by hints used)
const strandsScore = { 0: 28, 1: 25, 2: 22, 3: 19 };

// Mini Crossword (by time in seconds)
function miniScore(seconds) {
    if (seconds < 45) return 28;
    if (seconds < 60) return 24;
    if (seconds < 90) return 20;
    if (seconds < 120) return 16;
    return 12;
}
```

**6-Guess Games (Worldle, Tradle, Framed, etc.):**
```javascript
const sixGuessScore = { 1: 35, 2: 28, 3: 22, 4: 16, 5: 10, 6: 6 };
```

**GS Originals:**
```javascript
// Quotle (4 guesses)
const quotleScore = { 1: 50, 2: 30, 3: 20, 4: 12 };

// Rungs
function rungsScore(attempts) {
    if (attempts === 1) return 35;  // Perfect
    if (attempts === 2) return 28;
    if (attempts === 3) return 21;
    if (attempts === 4) return 14;
    return 7;
}
```

---

## 💬 QUOTLE

### Game Mechanics
- **Type**: Daily quote guessing game (like Wordle but for quotes)
- **Objective**: Identify the author of a famous quote
- **Guesses**: 4 attempts
- **Modes**: Easy (dropdown with filtering) and Hard (free typing)

### Quote Database
- 390 public domain quotes
- One quote per day (cycles through year)
- Includes: historical figures, presidents, authors, scientists

### Features
| Feature | Description |
|---------|-------------|
| Easy Mode | Dropdown filters by first letter as you type |
| Hard Mode | Free text entry only |
| Historical Context | Deep dive info after solving |
| Wikipedia Link | Direct link to author's Wikipedia |
| TTS | Text-to-speech for quote |
| Share Results | Copy shareable result text |

### Share Text Format
```
Quotle #123 2/4 🎯
⬜⬜🟩🟩
```

### Hint Strategy (for AI)
| Level | What to Reveal |
|-------|----------------|
| 1-2 | Time period, nationality |
| 3-4 | Profession, famous for |
| 5-6 | First name or last name initial |
| 7-8 | Partial name |
| 9-10 | Full name / answer |

---

## 🪨 SLATE

### Game Mechanics
- **Type**: Daily word puzzle
- **Grid**: 8×5 letter grid
- **Objective**: Find all hidden words
- **Theme**: Chalkboard aesthetic

### Features
- Daily words sync across all users
- Swipe or tap to select letters
- Words can go any direction
- Found words highlight green

### Share Text Format
```
Slate #45 ✓
Found all 8 words!
⏱️ 2:34
```

### Hint Strategy (for AI)
| Level | What to Reveal |
|-------|----------------|
| 1-3 | Number of words remaining, general location |
| 4-6 | First letter of a word, row/column hint |
| 7-8 | Specific word location |
| 9-10 | Actual word |

---

## 🪜 RUNGS

### Game Mechanics
- **Type**: Word ladder puzzle
- **Objective**: Transform START word to END word
- **Rule**: Change exactly ONE letter per step
- **Constraint**: Each step must be valid English word

### Example
```
COLD → CORD → CARD → WARD → WARM
```

### Scoring
- Perfect (minimum steps) = Best score
- Each extra step reduces score

### UI Notes
- Stack display with drag-to-reorder
- ⚠️ Arrow direction: ▲ moves UP visually (higher index due to column-reverse)

### Share Text Format
```
Rungs #78 ✓
COLD → WARM in 4 steps
⭐ Perfect!
```

### Hint Strategy (for AI)
| Level | What to Reveal |
|-------|----------------|
| 1-3 | Strategy tips (change vowels, common patterns) |
| 4-6 | One intermediate word |
| 7-8 | Multiple steps in path |
| 9-10 | Complete solution path |

---

## 🥊 WORD BOXING

### Game Mechanics
- **Type**: Multiplayer word game
- **Theme**: Boxing ring
- **Gameplay**: Real-time word battles
- **Scoring**: Based on word length and speed

### Firebase Integration
- Real-time updates via Firebase Realtime Database
- Battle state synced between players
- Results stored for history

### Share Text Format
```
Word Boxing 🥊
Won vs Player123!
Score: 450 - 380
```

---

## 📋 SHARE TEXT PARSING PATTERNS

Game Shelf uses regex patterns to detect and parse share texts:

```javascript
// Wordle
/Wordle\s+(\d{1,4})\s+([1-6X])\/6/i
// Extracts: puzzle number, guesses (1-6 or X for fail)

// Connections
/Connections\s*#?(\d+)/i
// Mistakes counted from emoji grid

// Strands
/Strands\s*#?(\d+)/i
// Hints counted from 💡 emoji

// Quotle
/Quotle\s*#?(\d+)\s*([1-4])\/4/i

// Mini
/Mini Crossword.*?(\d+):(\d+)/i
// Extracts: minutes, seconds
```

### Detection Priority
1. Look for game name keyword
2. Extract puzzle number
3. Parse score/result from format
4. Count emoji grid if present

---

## 🎯 AI HINT GUIDELINES

When generating hints for any game:

### Level Scale
| Level | Hint Type | Example |
|-------|-----------|---------|
| 1-2 | Vague nudge | "Think about the time period" |
| 3-4 | Direction | "Focus on 19th century America" |
| 5-6 | Partial reveal | "Starts with 'L'" |
| 7-8 | Strong hint | "Abraham ___" |
| 9-10 | Answer | "Abraham Lincoln" |

### Rules for Hints
1. **Never exceed the level** - Level 3 hint should NOT reveal the answer
2. **Be concise** - Under 50 words
3. **No preamble** - Start with the hint directly
4. **Game-appropriate** - Use game's terminology

### Games with Web Search
These games need current day's puzzle data:
- Wordle, Connections, Strands, Spelling Bee, Mini (NYT)
- LinkedIn games

### Games without Web Search
These have static/local data:
- Quotle (quotes database in app)
- Rungs (word ladder logic)
- Slate (grid in app)
