# Game Shelf Share Hub - Deep Code Analysis

## Feature Overview

The Share Hub is a comprehensive sharing system that lets users share their daily puzzle results across multiple platforms. It's accessible as a dedicated tab in the app navigation.

### Core Features
- **Message Templates**: Default, Brag, Humble, Streak, Challenge, Minimal
- **Platform Support**: Twitter/X, Facebook, LinkedIn, Threads, Reddit, Discord, BlueSky, Mastodon
- **Smart Hashtags**: Auto-appends platform-specific hashtags (#Wordle, #Connections, etc.)
- **Share History**: Stores last 20 shares for re-use
- **Image Card Generator**: Creates shareable images with multiple styles/formats
- **Weekly Recap**: Generates weekly statistics summary
- **Quick Share FAB**: Floating action button for instant sharing
- **Native Share API**: Uses device share sheet when available
- **Referral Link Integration**: Option to include invite link in messages

---

## Test Scenarios

### Scenario 1: Basic Daily Share
**Setup:** User has played Wordle (3/6) and Connections (1 mistake) today

**Expected Flow:**
1. User taps Share tab or FAB
2. Results populate: "🟩 Wordle: 3/6" and "🟪 Connections: 1 mistake"
3. Template generates message with results
4. User taps Twitter → Opens Twitter with pre-filled text + hashtags
5. Share saved to history

**Verify:**
- [ ] Results display correctly
- [ ] Message includes emoji grids if available
- [ ] Hashtags appended for Twitter
- [ ] History entry created

---

### Scenario 2: Share to Copy-Only Platforms
**Setup:** User wants to share to Discord (no direct URL scheme)

**Expected Flow:**
1. User composes message
2. Taps Discord button
3. Message copied to clipboard
4. Toast shows "📋 Copied! Paste in Discord"

**Verify:**
- [ ] Clipboard contains full message
- [ ] Toast displayed
- [ ] History entry created with platform='discord'

---

### Scenario 3: Image Card Generation
**Setup:** User wants to share as image

**Expected Flow:**
1. User taps "Quick Share All Results"
2. Instant share sheet opens with:
   - Text preview (editable)
   - Image card preview (canvas)
3. User can change style (Default, Dark, Gradient, Minimal)
4. User can change format (Landscape, Story)
5. User taps download or share image

**Verify:**
- [ ] Canvas renders correctly at 2x resolution
- [ ] Style changes update card immediately
- [ ] Format toggle changes aspect ratio
- [ ] Download creates PNG file
- [ ] Native share works on supported devices

---

### Scenario 4: Weekly Recap
**Setup:** User has played games for 5 days this week

**Expected Flow:**
1. User taps "Share Weekly Recap"
2. Stats calculated:
   - Total games played
   - Days active (5/7)
   - Win rate
   - Perfect count
   - Top 3 games
   - Friends beaten
3. Message generated with stats

**Verify:**
- [ ] Date range correct (Sunday-today)
- [ ] Game counts accurate
- [ ] Win rate calculated correctly
- [ ] Top games sorted by frequency

---

### Scenario 5: Share History Re-use
**Setup:** User shared to Twitter yesterday, wants to share similar message

**Expected Flow:**
1. User selects "📜 From History..." in template dropdown
2. History section expands
3. User taps previous share entry
4. Message loaded into textarea
5. User can edit and share again

**Verify:**
- [ ] History shows last 10 entries
- [ ] Platform icons display correctly
- [ ] Message preview truncated at 50 chars
- [ ] Loading from history works

---

## Bugs Found

### BUG 1: XSS in Share History Rendering
**Severity:** MEDIUM
**Location:** `renderShareHistory()` line 27158

**Problem:**
```javascript
const preview = entry.message.split('\n')[0].substring(0, 50) + (entry.message.length > 50 ? '...' : '');
// ...
<div class="share-history-item-preview">${preview}</div>
```

User-generated message content is inserted directly into HTML without escaping.

**Scenario:**
1. User edits share message to include `<script>alert('xss')</script>`
2. User shares (saves to history)
3. Next time history renders, script executes

**Risk:** Low - user would be attacking themselves, but still poor practice.

**Fix Required:**
```javascript
const preview = escapeHtml(entry.message.split('\n')[0].substring(0, 50)) + (entry.message.length > 50 ? '...' : '');
// Also escape entry.platform
<span class="share-history-item-platform">${icon} ${escapeHtml(entry.platform)}</span>
```

---

### BUG 2: Share History Platform Not Escaped
**Severity:** LOW  
**Location:** `renderShareHistory()` line 27155

**Problem:**
```javascript
<span class="share-history-item-platform">${icon} ${entry.platform}</span>
```

Platform comes from controlled set of values, but still should be escaped for defense in depth.

---

### BUG 3: Referral Link Uses Wrong Domain
**Severity:** LOW
**Location:** `generateTodayRecapMessage()` line 25784

**Problem:**
```javascript
lines.push('Track your puzzles: gameshelf.app 🧩');
```

But `getReferralLink()` uses `REFERRAL_BASE_URL` which likely points to gameshelf.co.

**Check:** Verify `REFERRAL_BASE_URL` value and align messaging.

---

### BUG 4: Weekly Stats Date Calculation Edge Case
**Severity:** LOW
**Location:** `getWeeklyStats()` line 25873

**Problem:**
```javascript
const dateStr = date.toISOString().split('T')[0];
```

Uses UTC date string but `appData.history` keys use local dates from `getTodayString()`. Could cause mismatch late at night.

**Fix Required:**
Use consistent local date formatting:
```javascript
const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
```

---

### BUG 5: Clipboard Copy Fallback Uses Deprecated API
**Severity:** LOW
**Location:** `copyShareMessage()` line 27045, `copyInstantShare()` line 26072

**Problem:**
```javascript
document.execCommand('copy');
```

`execCommand` is deprecated. Works but may be removed in future browsers.

**Note:** This is a fallback for older browsers, so acceptable for now.

---

## Missing Features / Improvements

### MISSING 1: Error Handling for Failed Shares
**Severity:** LOW

**Problem:**
When `window.open()` fails (popup blocked), no feedback to user.

**Suggested Fix:**
```javascript
const popup = window.open(url, '_blank');
if (!popup) {
    showToast('Popup blocked. Try copying instead.', 'warning');
    copyShareMessage();
}
```

---

### MISSING 2: Share Analytics
**Severity:** LOW

**Problem:**
No tracking of which platforms users share to most frequently.

**Suggested Implementation:**
- Count shares by platform in `appData.shareStats`
- Could inform future feature prioritization

---

### MISSING 3: Character Count for Twitter
**Severity:** LOW

**Problem:**
Twitter has 280 character limit. Long messages get truncated.

**Suggested Implementation:**
- Show character count when Twitter is selected
- Warn if message exceeds limit

---

### MISSING 4: Preview Hashtags Before Sharing
**Severity:** LOW

**Problem:**
Hashtags are appended silently. User doesn't see final message.

**Current:** "Opening Twitter..." toast
**Better:** Show which hashtags were added

---

### MISSING 5: Grid Preservation Inconsistent
**Severity:** MEDIUM

**Problem:**
Not all game parsers save the emoji grid. Some games show grid in share, others don't.

**Games with grid:**
- Wordle ✅
- Connections ✅

**Games without grid (check these):**
- Strands
- Mini
- Others

**Impact:** Share quality varies by game.

---

## Security Considerations

### Referral Code in URLs
- Referral codes are visible in shared URLs
- Could be used to track users across shares
- Acceptable for feature purpose, but users should understand

### Share History Storage
- Stored locally in `appData.shareHistory`
- Synced to Firebase (if signed in)
- Contains full message text including any personal notes user added
- Consider: Should share history sync to cloud?

---

## Testing Checklist for Beta

### Share Flow Tests
- [ ] **Share to Twitter** - Opens with correct URL, hashtags appended
- [ ] **Share to Facebook** - Copies message, opens Facebook
- [ ] **Share to LinkedIn** - Copies message, opens LinkedIn
- [ ] **Share to Threads** - Opens with intent URL
- [ ] **Share to Reddit** - Opens with title + text
- [ ] **Share to Discord** - Copies message only
- [ ] **Share to BlueSky** - Opens with intent URL
- [ ] **Share to Mastodon** - Opens mastodonshare.com
- [ ] **Copy button** - Copies to clipboard
- [ ] **Native share** - Uses device share sheet

### Template Tests
- [ ] **Default template** - Shows game list + count
- [ ] **Brag template** - Uses "Crushed it" language
- [ ] **Humble template** - Uses modest language
- [ ] **Streak template** - Shows streak prominently
- [ ] **Challenge template** - Invites competition
- [ ] **Minimal template** - Single line format

### Image Card Tests
- [ ] **Default style** - Dark purple theme
- [ ] **Dark style** - Black theme with green accent
- [ ] **Gradient style** - Purple/blue gradient
- [ ] **Minimal style** - White background
- [ ] **Landscape format** - 600x400 aspect
- [ ] **Story format** - 540x960 aspect
- [ ] **Download** - Creates PNG file
- [ ] **Share image** - Uses native share (iOS/Android)

### History Tests
- [ ] **Save to history** - Entry created after share
- [ ] **History displays** - Shows last 10 entries
- [ ] **Load from history** - Fills textarea
- [ ] **Toggle save** - Unchecking prevents save

### Edge Cases
- [ ] **No games played** - Shows "No games played yet"
- [ ] **Very long message** - Handles gracefully
- [ ] **Special characters in score** - Emojis preserved
- [ ] **Offline mode** - Can still copy/share locally

---

## Recommended Priority Fixes

### P0 - Fix Before Beta
1. **BUG 1**: XSS in share history (add escapeHtml to preview)

### P1 - Fix Soon After
2. **BUG 4**: Weekly stats date mismatch (use local dates)
3. **MISSING 1**: Popup blocked handling

### P2 - Nice to Have
4. **BUG 3**: Referral link domain alignment
5. **MISSING 3**: Twitter character count
6. **MISSING 5**: Grid preservation audit

---

## Quick Verification

```javascript
// Test share history XSS (in console)
appData.shareHistory = [{
    id: Date.now(),
    timestamp: new Date().toISOString(),
    platform: 'test<img src=x onerror=alert(1)>',
    message: '<script>alert("xss")</script>Test message',
    gamesCount: 1
}];
// Then open Share tab and check if alert fires

// Check referral base URL
console.log('Referral URL:', REFERRAL_BASE_URL);

// Check weekly stats calculation
console.log('Weekly stats:', getWeeklyStats());
```
