# Game Shelf Token Economy Implementation Plan

**Created:** January 26, 2026  
**Status:** Ready for Implementation  
**Priority:** High

---

## Executive Summary

This document outlines the complete implementation plan to:
1. Charge 5 tokens per AI hint
2. Fix wallet starting balance (100→50 tokens)
3. Update referral rewards structure
4. Add coin purchase integration
5. Implement security controls against abuse

---

## Part 1: Current State Analysis

### What Exists ✅

| Component | Current State | Notes |
|-----------|---------------|-------|
| Wallet system | Working | `appData.wallet = {tokens, coins}` |
| Token display | Working | Header shows 💎 tokens and 🪙 coins |
| Referral codes | Working | 8-char codes, Firebase storage |
| Referral tracking | Working | Tiers 1-3 tracked |
| Hint system | Working | Firebase function, rate limited |
| Battle wagers | Working | Coins only, $5 max |
| Achievements | Working | Award coins on unlock |
| Merch store | Working | Redeem coins for rewards |

### What's Wrong ❌

| Issue | Current | Should Be |
|-------|---------|-----------|
| Starting tokens | 100 | 50 |
| Hints cost | Free | 5 tokens |
| Referral Tier 3 trigger | "Battle or Share" | "Friend buys coin" |
| Coin purchase | Not implemented | $1/coin via payment |
| Coin→Token conversion | Not implemented | 1 coin = 100 tokens |

---

## Part 2: Code Changes Required

### 2.1 Fix Starting Balance (50 tokens)

**File:** `gameshelf/index.html`  
**Line:** ~13768

```javascript
// BEFORE
wallet: { tokens: 100, coins: 0 },

// AFTER
wallet: { tokens: 50, coins: 0 },
```

### 2.2 Update REFERRAL_REWARDS

**File:** `gameshelf/index.html`  
**Line:** ~15707

```javascript
// BEFORE
const REFERRAL_REWARDS = {
    invite: 10,      // Tier 1: Send invite
    joined: 50,      // Tier 2: Friend signs up
    engaged: 50      // Tier 3: Friend uses advanced feature
};

// AFTER
const REFERRAL_REWARDS = {
    sent: 10,        // Tier 1: Send referral email
    joined: 50,      // Tier 2: Friend creates Firebase account
    purchased: 100   // Tier 3: Friend buys first coin
};
```

### 2.3 Add Hint Token Cost

**File:** `gameshelf/index.html`  
**Function:** `getHint()` (line ~21835)

```javascript
async function getHint(level = hintLevel) {
    if (!hintCurrentGame || hintLoading) return;
    
    // ===== NEW: Check token balance =====
    const HINT_COST = 5;
    const tokens = appData.wallet?.tokens || 0;
    
    if (tokens < HINT_COST) {
        showInsufficientTokensSheet(tokens, HINT_COST);
        return;
    }
    // ===== END NEW =====
    
    // Check if user is signed in
    if (!currentUser) {
        document.getElementById('hint-error').textContent = 'Please sign in to use AI hints.';
        document.getElementById('hint-error').style.display = 'block';
        return;
    }
    
    // ... existing code ...
    
    // ===== AFTER successful hint (inside try block, after receiving hint) =====
    // Deduct tokens (server-side is source of truth, this is UI sync)
    appData.wallet.tokens -= HINT_COST;
    saveData();
    renderWallet();
    // ===== END =====
}
```

### 2.4 Add Insufficient Tokens UI

**File:** `gameshelf/index.html`  
**Add new function:**

```javascript
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
                    <div style="font-weight: 600; margin-bottom: 12px;">💡 Ways to get tokens:</div>
                    <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>📧 Invite a friend</span>
                            <strong style="color: var(--accent-purple);">+10</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>👋 Friend signs up</span>
                            <strong style="color: var(--accent-purple);">+50</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>💰 Friend buys coin</span>
                            <strong style="color: var(--accent-purple);">+100</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border);">
                            <span>🔄 Convert 1 coin</span>
                            <strong style="color: var(--accent-gold);">= 100 tokens</strong>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-primary" style="width: 100%; padding: 14px;" onclick="showReferralSheet(); closeGenericSheet();">
                        📧 Invite Friends
                    </button>
                    <button class="btn-secondary" style="width: 100%; padding: 14px;" onclick="showBuyCoinsSheet(); closeGenericSheet();">
                        💰 Buy Coins
                    </button>
                    ${appData.wallet?.coins > 0 ? `
                    <button class="btn-secondary" style="width: 100%; padding: 14px;" onclick="showConvertCoinsSheet(); closeGenericSheet();">
                        🔄 Convert Coins (${appData.wallet.coins} available)
                    </button>
                    ` : ''}
                </div>
            </div>
        `
    });
}
```

### 2.5 Add Coin Purchase System

**Add new UI sheet and functions:**

```javascript
// ============ COIN PURCHASE SYSTEM ============

function showBuyCoinsSheet() {
    showGenericSheet({
        title: '💰 Buy Coins',
        content: `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 2rem;">💰</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">
                        1 coin = $1.00 = 100 tokens
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="coin-purchase-option" onclick="purchaseCoins(5)" style="
                        background: var(--bg-tertiary);
                        border: 2px solid var(--border);
                        border-radius: 12px;
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                    ">
                        <div>
                            <div style="font-weight: 600;">5 Coins</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">500 tokens • 100 hints</div>
                        </div>
                        <div style="font-weight: 700; color: var(--accent-green);">$5.00</div>
                    </button>
                    
                    <button class="coin-purchase-option" onclick="purchaseCoins(10)" style="
                        background: linear-gradient(135deg, var(--accent-purple), var(--accent-orange));
                        border: none;
                        border-radius: 12px;
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        color: white;
                        position: relative;
                    ">
                        <div style="position: absolute; top: -8px; right: 12px; background: var(--accent-green); color: white; font-size: 0.65rem; padding: 2px 8px; border-radius: 10px;">POPULAR</div>
                        <div>
                            <div style="font-weight: 600;">10 Coins</div>
                            <div style="font-size: 0.8rem; opacity: 0.9;">1000 tokens • 200 hints</div>
                        </div>
                        <div style="font-weight: 700;">$10.00</div>
                    </button>
                    
                    <button class="coin-purchase-option" onclick="purchaseCoins(25)" style="
                        background: var(--bg-tertiary);
                        border: 2px solid var(--border);
                        border-radius: 12px;
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                    ">
                        <div>
                            <div style="font-weight: 600;">25 Coins</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">2500 tokens • 500 hints</div>
                        </div>
                        <div style="font-weight: 700; color: var(--accent-green);">$25.00</div>
                    </button>
                </div>
                
                <div style="margin-top: 20px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.8rem; color: var(--text-muted);">
                    <div style="font-weight: 600; margin-bottom: 4px;">🔒 Secure Payment</div>
                    <div>Payments processed by Stripe. We never see your card details.</div>
                </div>
            </div>
        `
    });
}

async function purchaseCoins(amount) {
    if (!currentUser) {
        showToast('Please sign in to purchase coins');
        return;
    }
    
    closeGenericSheet();
    showToast('🔄 Preparing checkout...');
    
    try {
        // Call Firebase function to create Stripe checkout session
        const createCheckout = firebase.functions().httpsCallable('createCoinCheckout');
        const result = await createCheckout({ 
            coinAmount: amount,
            successUrl: window.location.href + '?purchase=success',
            cancelUrl: window.location.href + '?purchase=cancelled'
        });
        
        // Redirect to Stripe checkout
        window.location.href = result.data.checkoutUrl;
        
    } catch (error) {
        console.error('Purchase error:', error);
        showToast('Purchase failed. Please try again.', 'error');
    }
}

// Check for successful purchase on page load
function checkPurchaseResult() {
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');
    
    if (purchaseStatus === 'success') {
        // Clear URL param
        window.history.replaceState({}, '', window.location.pathname);
        
        // Refresh wallet from server (Stripe webhook will have updated it)
        setTimeout(async () => {
            await loadFromCloud();
            renderWallet();
            showToast('🎉 Purchase complete! Coins added to your wallet.');
        }, 1000);
    } else if (purchaseStatus === 'cancelled') {
        window.history.replaceState({}, '', window.location.pathname);
        showToast('Purchase cancelled');
    }
}
```

### 2.6 Add Coin-to-Token Conversion

```javascript
function showConvertCoinsSheet() {
    const coins = appData.wallet?.coins || 0;
    
    if (coins === 0) {
        showToast('No coins to convert');
        return;
    }
    
    showGenericSheet({
        title: '🔄 Convert Coins to Tokens',
        content: `
            <div style="padding: 20px; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">🪙 → 💎</div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 1.2rem; font-weight: 600;">You have ${coins} coins</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">1 coin = 100 tokens</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Convert how many coins?</label>
                    <input type="number" id="convert-coins-amount" min="1" max="${coins}" value="1" 
                        style="width: 80px; padding: 12px; text-align: center; font-size: 1.2rem; border-radius: 8px; border: 2px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary);"
                        onchange="updateConversionPreview()"
                    >
                </div>
                
                <div id="conversion-preview" style="padding: 16px; background: var(--bg-tertiary); border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 0.85rem; color: var(--text-muted);">You'll receive</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-purple);">💎 100 tokens</div>
                </div>
                
                <button class="btn-primary" style="width: 100%; padding: 14px;" onclick="convertCoins()">
                    Convert Coins
                </button>
            </div>
        `
    });
}

function updateConversionPreview() {
    const amount = parseInt(document.getElementById('convert-coins-amount').value) || 0;
    const tokens = amount * 100;
    document.getElementById('conversion-preview').innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted);">You'll receive</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-purple);">💎 ${tokens.toLocaleString()} tokens</div>
    `;
}

async function convertCoins() {
    const amount = parseInt(document.getElementById('convert-coins-amount').value) || 0;
    const coins = appData.wallet?.coins || 0;
    
    if (amount < 1 || amount > coins) {
        showToast('Invalid amount');
        return;
    }
    
    // Update locally
    appData.wallet.coins -= amount;
    appData.wallet.tokens += amount * 100;
    saveData();
    renderWallet();
    
    closeGenericSheet();
    showToast(`🎉 Converted ${amount} coins to ${amount * 100} tokens!`);
    
    // Sync to cloud
    if (currentUser) {
        await saveToCloud();
    }
}
```

### 2.7 Firebase Function Updates

**File:** `firebase-functions/functions/index.js`

Add token deduction to getHint:

```javascript
const HINT_COST = 5;

exports.getHint = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const userId = context.auth.uid;
    
    // ===== NEW: Check and deduct tokens =====
    const walletRef = db.ref(`users/${userId}/wallet/tokens`);
    const tokensSnapshot = await walletRef.once('value');
    const tokens = tokensSnapshot.val() || 0;
    
    if (tokens < HINT_COST) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Insufficient tokens. You have ${tokens}, need ${HINT_COST}.`,
            { tokens, required: HINT_COST }
        );
    }
    
    // ... existing rate limit checks ...
    // ... existing API call ...
    
    // After successful hint, deduct tokens
    await walletRef.set(tokens - HINT_COST);
    
    // Log token transaction
    await db.ref(`users/${userId}/tokenHistory`).push({
        type: 'hint',
        amount: -HINT_COST,
        gameId: data.gameId,
        timestamp: admin.database.ServerValue.TIMESTAMP
    });
    // ===== END NEW =====
    
    return { hint: hint, usage: usage };
});
```

Add new Stripe checkout function:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCoinCheckout = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { coinAmount, successUrl, cancelUrl } = data;
    const userId = context.auth.uid;
    
    // Validate amount (security: prevent arbitrary amounts)
    const validAmounts = [5, 10, 25, 50, 100];
    if (!validAmounts.includes(coinAmount)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid coin amount');
    }
    
    const priceInCents = coinAmount * 100; // $1 per coin
    
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${coinAmount} Game Shelf Coins`,
                    description: `${coinAmount * 100} tokens for AI hints`
                },
                unit_amount: priceInCents
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            userId: userId,
            coinAmount: coinAmount.toString(),
            tokenAmount: (coinAmount * 100).toString()
        }
    });
    
    return { checkoutUrl: session.url, sessionId: session.id };
});

// Stripe webhook to fulfill purchase
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const coinAmount = parseInt(session.metadata.coinAmount);
        
        // Add coins to user's wallet
        const walletRef = db.ref(`users/${userId}/wallet`);
        const wallet = (await walletRef.once('value')).val() || { tokens: 0, coins: 0 };
        
        await walletRef.update({
            coins: (wallet.coins || 0) + coinAmount
        });
        
        // Log purchase
        await db.ref(`purchases/${userId}`).push({
            type: 'coins',
            amount: coinAmount,
            price: coinAmount * 100, // cents
            stripeSessionId: session.id,
            timestamp: admin.database.ServerValue.TIMESTAMP
        });
        
        // Check if this is user's first purchase (for referral reward)
        const purchaseCount = (await db.ref(`purchases/${userId}`).once('value')).numChildren();
        if (purchaseCount === 1) {
            await triggerReferralPurchaseReward(userId);
        }
        
        console.log(`Added ${coinAmount} coins to user ${userId}`);
    }
    
    res.json({ received: true });
});

// Award referrer when referred user makes first purchase
async function triggerReferralPurchaseReward(userId) {
    // Get user's referral data
    const userDataRef = await db.ref(`users/${userId}`).once('value');
    const userData = userDataRef.val();
    
    const refCode = userData?.referral?.referredBy;
    if (!refCode) return;
    
    // Look up referrer
    const referrerSnapshot = await db.ref(`referralCodes/${refCode}`).once('value');
    const referrerData = referrerSnapshot.val();
    if (!referrerData) return;
    
    // Check if already awarded for this user's purchase
    const refereeData = referrerData.referees?.[userId];
    if (refereeData?.purchaseRewarded) return;
    
    // Mark as rewarded and award tokens
    await db.ref(`referralCodes/${refCode}/referees/${userId}/purchaseRewarded`).set(true);
    await db.ref(`referralCodes/${refCode}/referees/${userId}/purchasedAt`).set(Date.now());
    
    // Queue reward for referrer
    await db.ref(`users/${referrerData.ownerId}/pendingReferralRewards`).push({
        type: 'purchased',
        tokens: 100, // REFERRAL_REWARDS.purchased
        fromName: userData.displayName || 'A friend',
        timestamp: Date.now()
    });
    
    console.log(`Awarded referral purchase bonus to ${referrerData.ownerId}`);
}
```

---

## Part 3: Security Audit & Abuse Prevention

### 3.1 Fake Friend Signups

**Threat:** User creates multiple accounts to earn referral tokens.

**Mitigations:**

| Control | Implementation |
|---------|----------------|
| **Email verification** | Require verified email before awarding Tier 2 bonus |
| **Device fingerprinting** | Track device ID, flag if same device creates multiple accounts |
| **IP rate limiting** | Max 3 new accounts per IP per day |
| **Delay rewards** | Award Tier 2 tokens after 24-hour delay |
| **Activity threshold** | Require referred user to log 3 games before awarding Tier 2 |

**Code addition (Firebase):**

```javascript
// In processReferralSignup, add activity threshold
async function processReferralSignup() {
    // ... existing code ...
    
    // Don't award Tier 2 immediately - queue it
    await db.ref(`pendingTier2Awards/${currentUser.uid}`).set({
        referrerCode: refCode,
        referrerId: referrerId,
        createdAt: Date.now(),
        qualifyAfter: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        gamesRequired: 3
    });
    
    // Award welcome bonus (smaller, immediate)
    appData.wallet.tokens += 25; // Reduced from 50, rest comes at Tier 2
}

// Run periodically via Cloud Scheduler
exports.processQualifiedReferrals = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
        const pendingRef = db.ref('pendingTier2Awards');
        const pending = await pendingRef.once('value');
        
        pending.forEach(async (snap) => {
            const data = snap.val();
            const userId = snap.key;
            
            // Check if qualified
            const userData = await db.ref(`users/${userId}`).once('value');
            const gamesPlayed = Object.keys(userData.val()?.history || {}).length;
            
            if (Date.now() > data.qualifyAfter && gamesPlayed >= data.gamesRequired) {
                // Award Tier 2 to referrer
                await db.ref(`users/${data.referrerId}/pendingReferralRewards`).push({
                    type: 'joined',
                    tokens: 50,
                    fromUid: userId,
                    timestamp: Date.now()
                });
                
                // Award rest of welcome bonus to new user
                const walletRef = db.ref(`users/${userId}/wallet/tokens`);
                const tokens = (await walletRef.once('value')).val() || 0;
                await walletRef.set(tokens + 25);
                
                // Remove from pending
                await snap.ref.remove();
            }
        });
    });
```

### 3.2 Fake Friend Logins

**Threat:** User creates account, logs in once to trigger Tier 2, never uses app.

**Mitigations:**

| Control | Implementation |
|---------|----------------|
| **Activity threshold** | As above - require 3 games logged |
| **Email domain check** | Flag disposable email domains (mailinator, etc.) |
| **Honeypot detection** | Accounts that only trigger referral and never engage |

**Disposable email check:**

```javascript
const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
    'throwaway.email', 'getnada.com', 'maildrop.cc', 'sharklasers.com'
    // ... add more
];

function isDisposableEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
}

// In auth flow
if (isDisposableEmail(user.email)) {
    // Flag account, don't award referral bonuses
    await db.ref(`flaggedAccounts/${user.uid}`).set({
        reason: 'disposable_email',
        email: user.email,
        timestamp: Date.now()
    });
}
```

### 3.3 Fraudulent Credit Card Purchases

**Threat:** User buys coins with stolen card, card is charged back.

**Mitigations:**

| Control | Implementation |
|---------|----------------|
| **Stripe Radar** | Enable Stripe's fraud detection (default) |
| **Purchase velocity** | Max $50/day, $200/week for new accounts |
| **Chargeback handling** | Auto-deduct coins on chargeback webhook |
| **Account age requirement** | Account must be 7 days old for purchases |
| **Verified email required** | Must verify email before purchasing |

**Firebase function for chargebacks:**

```javascript
// Handle Stripe chargeback webhook
if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const paymentIntent = dispute.payment_intent;
    
    // Find the purchase
    const purchasesRef = db.ref('purchases');
    const snapshot = await purchasesRef
        .orderByChild('stripePaymentIntent')
        .equalTo(paymentIntent)
        .once('value');
    
    snapshot.forEach(async (purchaseSnap) => {
        const purchase = purchaseSnap.val();
        const userId = purchaseSnap.ref.parent.key;
        
        // Deduct coins (or set negative balance)
        const walletRef = db.ref(`users/${userId}/wallet/coins`);
        const coins = (await walletRef.once('value')).val() || 0;
        await walletRef.set(coins - purchase.amount);
        
        // Flag account
        await db.ref(`flaggedAccounts/${userId}`).set({
            reason: 'chargeback',
            disputeId: dispute.id,
            amount: purchase.amount,
            timestamp: Date.now()
        });
        
        // Lock account from future purchases
        await db.ref(`users/${userId}/purchaseLocked`).set(true);
        
        console.log(`Chargeback processed for user ${userId}: -${purchase.amount} coins`);
    });
}
```

### 3.4 Purchase Limits

**File:** Firebase function

```javascript
const PURCHASE_LIMITS = {
    daily: 5000,      // $50/day in cents
    weekly: 20000,    // $200/week
    minAccountAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    singlePurchaseMax: 10000 // $100 max single purchase
};

async function checkPurchaseLimits(userId, amountCents) {
    // Check account age
    const userRef = await db.ref(`users/${userId}/createdAt`).once('value');
    const createdAt = userRef.val() || Date.now();
    const accountAge = Date.now() - createdAt;
    
    if (accountAge < PURCHASE_LIMITS.minAccountAge) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Account must be at least 7 days old to purchase coins'
        );
    }
    
    // Check single purchase limit
    if (amountCents > PURCHASE_LIMITS.singlePurchaseMax) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Maximum single purchase is $100'
        );
    }
    
    // Check daily limit
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentPurchases = await db.ref(`purchases/${userId}`)
        .orderByChild('timestamp')
        .startAt(dayAgo)
        .once('value');
    
    let dailyTotal = 0;
    recentPurchases.forEach(snap => {
        dailyTotal += snap.val().price || 0;
    });
    
    if (dailyTotal + amountCents > PURCHASE_LIMITS.daily) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Daily purchase limit reached ($${(PURCHASE_LIMITS.daily/100).toFixed(2)})`
        );
    }
    
    // Similar check for weekly...
    
    return true;
}
```

### 3.5 Merch Redemption Limits

**Threat:** User accumulates coins, redeems expensive items, then chargesback.

**Mitigations:**

| Control | Implementation |
|---------|----------------|
| **Redemption cooldown** | 24 hours between redemptions |
| **Account age for physical** | 30 days account age for physical rewards |
| **Verified email** | Required for any redemption |
| **Weekly redemption cap** | Max $100 redemption value per week |
| **Chargeback blacklist** | Any chargeback history = no redemption |

```javascript
const REDEMPTION_LIMITS = {
    cooldownMs: 24 * 60 * 60 * 1000,           // 24 hours
    physicalMinAccountAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    weeklyMaxValue: 10000                       // $100 in cents
};

async function canRedeem(userId, item) {
    // Check for chargeback history
    const flagged = await db.ref(`flaggedAccounts/${userId}`).once('value');
    if (flagged.exists() && flagged.val().reason === 'chargeback') {
        throw new Error('Account not eligible for redemption');
    }
    
    // Check cooldown
    const lastRedemption = await db.ref(`users/${userId}/lastRedemption`).once('value');
    if (lastRedemption.exists()) {
        const timeSince = Date.now() - lastRedemption.val();
        if (timeSince < REDEMPTION_LIMITS.cooldownMs) {
            const hoursLeft = Math.ceil((REDEMPTION_LIMITS.cooldownMs - timeSince) / (60 * 60 * 1000));
            throw new Error(`Please wait ${hoursLeft} hours before next redemption`);
        }
    }
    
    // Check account age for physical items
    if (item.category === 'physical') {
        const createdAt = (await db.ref(`users/${userId}/createdAt`).once('value')).val();
        if (Date.now() - createdAt < REDEMPTION_LIMITS.physicalMinAccountAge) {
            throw new Error('Account must be 30 days old for physical rewards');
        }
    }
    
    return true;
}
```

### 3.6 Battle Wager Limits (Already Implemented ✅)

Current limit: $5 max wager per battle. This keeps Game Shelf from being classified as a gambling platform.

**Additional controls:**

```javascript
// Already in code - just documenting
const MAX_WAGER = 5; // coins

// Add: Daily/weekly wager limits
const WAGER_LIMITS = {
    dailyMax: 20,    // Max 20 coins wagered per day
    weeklyMax: 50    // Max 50 coins wagered per week
};
```

---

## Part 4: Implementation Priority

### Phase 1: Core Token Economy (v1.2.49)
- [ ] Fix starting balance (100→50)
- [ ] Add hint token cost (5 tokens)
- [ ] Update Firebase function with token check
- [ ] Add insufficient tokens UI
- [ ] Add coin-to-token conversion UI
- [ ] Test locally

### Phase 2: Referral Updates (v1.2.50)
- [ ] Update REFERRAL_REWARDS constants
- [ ] Change Tier 3 trigger from "engagement" to "purchase"
- [ ] Add activity threshold for Tier 2 (3 games)
- [ ] Add 24-hour delay for Tier 2 awards

### Phase 3: Payment Integration (v1.2.51)
- [ ] Set up Stripe account
- [ ] Add Firebase functions for checkout
- [ ] Add webhook for payment completion
- [ ] Add coin purchase UI
- [ ] Test with Stripe test mode

### Phase 4: Security Hardening (v1.2.52)
- [ ] Add purchase limits
- [ ] Add chargeback handling
- [ ] Add disposable email detection
- [ ] Add redemption cooldowns
- [ ] Add account flagging system
- [ ] Security testing

---

## Part 5: Testing Checklist

### Token Economy Tests
- [ ] New user gets 50 tokens
- [ ] Hint costs 5 tokens
- [ ] Hint fails with <5 tokens
- [ ] Coin conversion works (1:100)
- [ ] Wallet syncs to cloud

### Referral Tests
- [ ] Tier 1: +10 tokens on send
- [ ] Tier 2: +50 tokens when friend joins (after 24h + 3 games)
- [ ] Tier 3: +100 tokens when friend purchases
- [ ] Referred user gets 50 tokens (split 25+25)

### Payment Tests (Stripe Test Mode)
- [ ] Checkout flow works
- [ ] Webhook credits coins
- [ ] Purchase limits enforced
- [ ] Chargeback deducts coins

### Security Tests
- [ ] Can't self-refer (same device)
- [ ] Disposable emails flagged
- [ ] Purchase limits work
- [ ] Redemption cooldown works
- [ ] Flagged accounts can't redeem

---

## Appendix: Environment Variables Needed

**Firebase Functions (.env):**
```
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Stripe Dashboard Setup:**
1. Create webhook endpoint pointing to your Firebase function URL
2. Listen for events: `checkout.session.completed`, `charge.dispute.created`
3. Get webhook signing secret
