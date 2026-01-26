# Game Shelf Economic Analysis

**Generated:** January 26, 2026  
**Based on:** gs-active-2026-01-26 archive  
**Game Shelf Version:** 1.2.48

---

## Executive Summary

Game Shelf's AI Hint system creates real operational costs that scale with user growth. This analysis examines the token economy with hint costs funded through coin-to-token conversion.

**Key Economics:**
- 1 coin = 100 tokens = $1.00 (assumed coin value)
- 1 hint = 5 tokens = **$0.05**
- Actual API cost per hint: ~$0.015-0.02
- **Margin: ~60-70%** ✅ Sustainable

---

## 1. Token Economy Design

### Token Sources

| Activity | Tokens | Notes |
|----------|--------|-------|
| Sign up bonus | 50 | One-time welcome gift |
| Send referral email | 10 | Per email sent |
| Referral creates account | 50 | When they sign up with Firebase |
| Referral buys a coin | 100 | When they make first purchase |
| Convert coins to tokens | 100 per coin | Primary token source for heavy users |
| **5-day streak** | **50** | **One-time when any game reaches 5-day streak** |
| **All GS games played** | **20** | **One-time for playing Quotle, Slate, Rungs, Word Boxing** |
| **Coin battle participation** | **5** | **Each time you create/join a coin-based battle** |

### Token Sinks

| Activity | Token Cost | Notes |
|----------|------------|-------|
| AI Hint (any level) | 5 | Flat rate, all hint levels |
| Battle wagers | Variable | Redistributes existing tokens, no creation/destruction |

### Token Flow Diagram

```
                    ┌─────────────────┐
                    │   NEW TOKENS    │
                    │    CREATED      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐        ┌───────────┐        ┌───────────┐
   │ Sign Up │        │ Referrals │        │ Coin→Token│
   │   +50   │        │ +10/50/100│        │  Convert  │
   └────┬────┘        └─────┬─────┘        └─────┬─────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ USER'S WALLET │
                    │   (Tokens)    │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  HINTS   │  │ BATTLES  │  │  (Future │
        │ -5/hint  │  │ (wagers) │  │  sinks)  │
        └──────────┘  └──────────┘  └──────────┘
              │             │
              │             │ (redistributed)
              ▼             │
        ┌──────────┐        │
        │ DESTROYED│◄───────┘
        │ (burned) │   Battles don't burn,
        └──────────┘   just move between users
```

---

## 2. Real Cost Analysis

### Claude API Costs (claude-sonnet-4-20250514)

| Component | Rate |
|-----------|------|
| Input tokens | $3.00 per million |
| Output tokens | $15.00 per million |
| Web search | $10.00 per 1,000 searches |

### Cost Per Hint

**With Web Search (NYT Games, Quotle, LinkedIn):**
```
Input: ~1,000 tokens × $3.00/1M = $0.003
Output: ~200 tokens × $15.00/1M = $0.003
Web Search: $10/1,000 = $0.01
Total: ~$0.016 per hint
```

**Without Web Search (Rungs, Slate):**
```
Input: ~600 tokens × $3.00/1M = $0.0018
Output: ~150 tokens × $15.00/1M = $0.00225
Total: ~$0.004 per hint
```

**Blended Average (70% web search):**
```
Average: ~$0.013 per hint
```

### Revenue vs Cost Per Hint

| Metric | Value |
|--------|-------|
| User pays | 5 tokens = $0.05 |
| Actual cost | ~$0.013-0.016 |
| **Gross margin** | **$0.034-0.037 (~70%)** |

✅ **This is excellent unit economics!**

---

## 3. User Journey Economics

### New User: First 10 Hints Free

```
Sign up bonus:           +50 tokens
─────────────────────────────────────
First 10 hints:          -50 tokens (5 × 10)
─────────────────────────────────────
Balance:                   0 tokens
```

A new user gets **10 free hints** to try the feature. This is enough to:
- Try hints across 3-4 different games
- Experience multiple hint levels
- Get hooked on the value

### Referral-Active User

```
Sign up bonus:           +50 tokens
Send 5 referral emails:  +50 tokens (10 × 5)
2 friends sign up:      +100 tokens (50 × 2)
1 friend buys coin:     +100 tokens
─────────────────────────────────────
Total earned:           +300 tokens
─────────────────────────────────────
Hints available:          60 hints
```

A user who actively refers friends can earn **60+ hints** without spending money.

### Paying User

```
Purchase 1 coin:         +100 tokens
─────────────────────────────────────
Cost:                      $1.00
Hints available:           20 hints
Cost per hint:            $0.05
```

---

## 4. Scaling Projections

### Assumptions
- Realistic DAU: 15% of registered users
- Hint users: 25% of DAU
- Hints per active user: 2/day

### Projection by User Scale

| Registered | DAU | Hint Users | Daily Hints | Daily Cost | Daily Revenue | **Daily Profit** |
|------------|-----|------------|-------------|------------|---------------|------------------|
| 1,000 | 150 | 38 | 76 | $1.14 | $3.80 | **$2.66** |
| 10,000 | 1,500 | 375 | 750 | $11.25 | $37.50 | **$26.25** |
| 100,000 | 15,000 | 3,750 | 7,500 | $112.50 | $375.00 | **$262.50** |

### Monthly Summary

| Scale | Monthly Hints | Monthly Cost | Monthly Revenue* | **Monthly Profit** |
|-------|---------------|--------------|------------------|-------------------|
| 1K users | 2,280 | $34 | $114 | **$80** |
| 10K users | 22,500 | $340 | $1,125 | **$785** |
| 100K users | 225,000 | $3,400 | $11,250 | **$7,850** |

*Revenue assumes all hints are from coin-purchased tokens. Actual revenue lower when users spend bonus/referral tokens.

### Break-Even Analysis

**When do hint costs become significant?**

With 70% margins, you're profitable from day one. The question is when revenue covers other costs (hosting, development time, etc.):

- At 1K users: ~$80/month profit covers basic Firebase costs
- At 10K users: ~$785/month could fund part-time development
- At 100K users: ~$7,850/month is meaningful revenue

---

## 5. Token Inflation Analysis

### Sources of Inflation

Every new user brings 50 tokens into existence. Referral activity creates more:

| Scenario | New Tokens Created |
|----------|-------------------|
| User signs up | 50 |
| User sends 3 referrals | 30 |
| 1 referral converts | 50 |
| **Total per active referrer** | **130** |

### Deflationary Pressure (Hints)

Each hint removes 5 tokens from circulation (they're spent, not redistributed).

**Break-even point:** A user needs to use **26 hints** to burn their initial 130 tokens.

### Long-Term Balance

| User Type | Tokens In | Tokens Out (Hints) | Net |
|-----------|-----------|-------------------|-----|
| Casual (joins, 10 hints) | 50 | 50 | 0 |
| Active (refers 2, 30 hints) | 150 | 150 | 0 |
| Power user (50+ hints) | 150 | 250+ | -100 (must buy) |

✅ **The economy is naturally balanced** - casual users use their bonus, active users earn through referrals, power users need to purchase.

---

## 6. Comparison: Current vs Proposed

| Aspect | Current | Proposed |
|--------|---------|----------|
| Hint cost | 0 (free) | 5 tokens |
| New user tokens | 0 | 50 |
| Token sinks | None | Hints |
| Revenue potential | $0 | $0.05/hint |
| Sustainability | ❌ Unsustainable | ✅ Profitable |

### Impact on Users

| User Type | Impact |
|-----------|--------|
| New user | Gets 10 free hints, same as before (rate limit was 50/day) |
| Casual user | Unlikely to notice - 10 hints is plenty |
| Power user | Needs to refer friends or buy coins |
| Heavy hint user | Clear value exchange - pay for what you use |

---

## 7. Implementation Requirements

### Database Changes

Add to user data structure:
```javascript
users/{uid}/
  wallet/
    tokens: 50      // Starting balance
    coins: 0
  tokenHistory/     // Optional: track transactions
    {timestamp}/
      type: 'signup_bonus' | 'referral_sent' | 'referral_joined' | 
            'referral_purchased' | 'coin_convert' | 'hint_used'
      amount: +50 | -5
      balance: 50
```

### Firebase Function Changes

```javascript
// In getHint function, add before API call:

const HINT_COST = 5;

// Get user's token balance
const userRef = db.ref(`users/${userId}/wallet/tokens`);
const tokenSnapshot = await userRef.once('value');
const tokens = tokenSnapshot.val() || 0;

if (tokens < HINT_COST) {
    throw new functions.https.HttpsError(
        'resource-exhausted',
        `Insufficient tokens. You have ${tokens}, need ${HINT_COST}.`,
        { tokens, required: HINT_COST }
    );
}

// After successful hint generation, deduct tokens:
await userRef.set(tokens - HINT_COST);

// Log the transaction
await db.ref(`users/${userId}/tokenHistory`).push({
    type: 'hint_used',
    amount: -HINT_COST,
    balance: tokens - HINT_COST,
    gameId: gameId,
    timestamp: admin.database.ServerValue.TIMESTAMP
});
```

### New Functions Needed

```javascript
// Convert coins to tokens
exports.convertCoinsToTokens = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated');
    
    const { coinAmount } = data;
    const userId = context.auth.uid;
    const CONVERSION_RATE = 100; // tokens per coin
    
    const walletRef = db.ref(`users/${userId}/wallet`);
    const wallet = (await walletRef.once('value')).val() || { coins: 0, tokens: 0 };
    
    if (wallet.coins < coinAmount) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient coins');
    }
    
    await walletRef.update({
        coins: wallet.coins - coinAmount,
        tokens: wallet.tokens + (coinAmount * CONVERSION_RATE)
    });
    
    return { 
        newTokens: wallet.tokens + (coinAmount * CONVERSION_RATE),
        newCoins: wallet.coins - coinAmount
    };
});

// Award signup bonus (call during onboarding)
exports.awardSignupBonus = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated');
    
    const userId = context.auth.uid;
    const SIGNUP_BONUS = 50;
    
    // Check if already claimed
    const bonusRef = db.ref(`users/${userId}/signupBonusClaimed`);
    const claimed = (await bonusRef.once('value')).val();
    
    if (claimed) {
        throw new functions.https.HttpsError('already-exists', 'Bonus already claimed');
    }
    
    // Award bonus
    const tokenRef = db.ref(`users/${userId}/wallet/tokens`);
    const currentTokens = (await tokenRef.once('value')).val() || 0;
    
    await tokenRef.set(currentTokens + SIGNUP_BONUS);
    await bonusRef.set(true);
    
    return { tokens: currentTokens + SIGNUP_BONUS };
});
```

### Client-Side Changes

```javascript
// Before requesting hint
async function getHint(level = hintLevel) {
    // ... existing validation ...
    
    // Check token balance
    const tokens = appData.wallet?.tokens || 0;
    const HINT_COST = 5;
    
    if (tokens < HINT_COST) {
        showInsufficientTokensSheet(tokens, HINT_COST);
        return;
    }
    
    // ... existing hint request code ...
    
    // On success, update local wallet (server already deducted)
    appData.wallet.tokens -= HINT_COST;
    renderWallet();
}

// Insufficient tokens UI
function showInsufficientTokensSheet(current, needed) {
    showGenericSheet({
        title: '💎 Need More Tokens',
        content: `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">💎</div>
                <div style="font-size: 1.1rem; margin-bottom: 8px;">
                    You have <strong>${current}</strong> tokens
                </div>
                <div style="color: var(--text-muted); margin-bottom: 24px;">
                    Hints cost <strong>${needed}</strong> tokens each
                </div>
                
                <div style="text-align: left; background: var(--bg-tertiary); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 12px;">Ways to earn tokens:</div>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem;">
                        <div>📧 Send referral email: <strong>+10 tokens</strong></div>
                        <div>👋 Friend signs up: <strong>+50 tokens</strong></div>
                        <div>💰 Friend buys coin: <strong>+100 tokens</strong></div>
                        <div>🔄 Convert 1 coin: <strong>+100 tokens</strong></div>
                    </div>
                </div>
                
                <button class="btn-primary" onclick="showReferralSheet(); closeGenericSheet();">
                    📧 Invite Friends
                </button>
                <button class="btn-secondary" style="margin-top: 10px;" onclick="showCoinConvertSheet(); closeGenericSheet();">
                    🔄 Convert Coins to Tokens
                </button>
            </div>
        `
    });
}
```

---

## 8. Referral Token Awards (Updated)

### Current Implementation
```javascript
const REFERRAL_REWARDS = {
    invite: 10,      // Tier 1: Send invite (currently called 'sent')
    joined: 50,      // Tier 2: Friend signs up
    engaged: 50      // Tier 3: Friend uses advanced feature
};
```

### Updated Implementation
```javascript
const REFERRAL_REWARDS = {
    sent: 10,        // Send referral email
    joined: 50,      // Friend creates Firebase account
    purchased: 100   // Friend buys their first coin
};
```

**Code change needed:** Update the `engaged` trigger to fire on first coin purchase instead of "advanced feature use."

---

## 9. Monitoring & KPIs

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Tokens created/day | - | Track trend |
| Tokens burned (hints)/day | - | Track trend |
| Token inflation rate | < 10%/month | > 20%/month |
| Hint conversion rate | > 5% of DAU | < 2% |
| Avg hints per paying user | 5-10/day | > 20/day (abuse?) |
| Revenue per 1K hints | $50 | < $30 |

### Firebase Analytics Events

```javascript
// Track these events
logActivity('hint_requested', { gameId, level, tokenCost: 5 });
logActivity('tokens_earned', { source: 'referral_sent', amount: 10 });
logActivity('tokens_earned', { source: 'referral_joined', amount: 50 });
logActivity('tokens_earned', { source: 'referral_purchased', amount: 100 });
logActivity('coins_converted', { coins: 1, tokens: 100 });
logActivity('insufficient_tokens', { current, needed });
```

---

## 10. Summary

### The Token Economy at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    GAME SHELF TOKENS                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💎 1 Token = $0.01                                    │
│  🪙 1 Coin = 100 Tokens = $1.00                        │
│  💡 1 Hint = 5 Tokens = $0.05                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  EARN TOKENS:                                           │
│  ├─ Sign up .............. +50 (10 free hints!)        │
│  ├─ Send referral ........ +10                         │
│  ├─ Friend joins ......... +50                         │
│  ├─ Friend buys coin ..... +100                        │
│  └─ Convert coins ........ +100 per coin               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  SPEND TOKENS:                                          │
│  └─ AI Hints ............. -5 per hint                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ECONOMICS:                                             │
│  ├─ Cost to serve hint ... ~$0.015                     │
│  ├─ Revenue per hint ..... $0.05                       │
│  └─ Gross margin ......... ~70% ✅                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Generous free tier** - 50 tokens = 10 hints for every new user
2. **Referral incentives** - Users can earn 160+ tokens per successful referral chain
3. **Clear value exchange** - $0.05/hint is cheap enough to not deter usage
4. **Sustainable margins** - 70% gross margin covers costs + profit
5. **No exploitation** - Heavy users pay proportionally more

### Next Steps

1. **Update Firebase functions** with token checking/deduction
2. **Add signup bonus** award on account creation
3. **Update referral rewards** to new structure (sent/joined/purchased)
4. **Add coin-to-token conversion** UI and function
5. **Add insufficient tokens** UI with earning suggestions
6. **Test thoroughly** in test environment before production
