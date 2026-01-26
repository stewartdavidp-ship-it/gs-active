# Game Shelf Security Audit

**Version:** 1.2.49  
**Date:** January 26, 2026  
**Status:** Implementation Ready

---

## Executive Summary

This document provides a comprehensive security analysis of the Game Shelf token economy, identifying potential abuse vectors and implementing countermeasures to prevent fraud, abuse, and gaming of the system.

---

## 1. Threat Model Overview

### Attack Surface Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAME SHELF ECONOMY                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TOKEN SOURCES (Inflows)                TOKEN SINKS (Outflows)     │
│   ├─ Signup bonus (50)                   ├─ AI Hints (-5/each)      │
│   ├─ Referral sent (+10)                 └─ (Future sinks)          │
│   ├─ Friend joined (+50)                                            │
│   ├─ Friend purchased (+100)             COIN SOURCES               │
│   └─ Coin conversion (+100/coin)         ├─ Purchases ($1/coin)     │
│                                          └─ Achievements            │
│   POTENTIAL ABUSE VECTORS                                           │
│   ├─ Fake friend signups                 COIN SINKS                 │
│   ├─ Fake friend logins                  ├─ Merch store             │
│   ├─ Self-referral                       ├─ Battle wagers ($5 max)  │
│   ├─ Fraudulent payments                 └─ Token conversion        │
│   ├─ Chargeback fraud                                               │
│   └─ Automated account creation                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Analysis & Mitigations

### 2.1 Fake Friend Signups (Sybil Attack)

**Threat Level:** 🔴 HIGH  
**Potential Impact:** User creates multiple fake accounts to farm referral tokens

**Attack Scenario:**
1. User creates account A
2. User creates accounts B, C, D, E using different emails
3. User uses A's referral link to sign up B, C, D, E
4. User earns: 10×4 (sent) + 50×4 (joined) = 240 tokens

**Mitigations Implemented:**

| Control | Implementation | Effectiveness |
|---------|----------------|---------------|
| **Email verification** | Firebase Auth requires verified email | Medium |
| **Self-referral detection** | Can't use own referral code | High |
| **Same device detection** | Track device fingerprint in referral chain | Medium |

**Mitigations To Add:**

| Control | Priority | Implementation |
|---------|----------|----------------|
| **IP rate limiting** | High | Max 3 new accounts per IP per day |
| **Device fingerprinting** | High | Store device ID, flag duplicates |
| **Activity threshold** | High | Require 3 games logged before awarding Tier 2 |
| **Delayed rewards** | Medium | 24-hour delay on Tier 2 rewards |
| **Disposable email check** | Medium | Block mailinator, guerrillamail, etc. |

**Code Implementation (Firebase Rules):**

```javascript
// In Firebase Security Rules
{
  "rules": {
    "referralCodes": {
      "$code": {
        "referees": {
          "$uid": {
            // Only allow write if user doesn't already exist
            ".write": "!data.exists()"
          }
        }
      }
    }
  }
}
```

**Recommended Database Checks:**

```javascript
// Server-side check before awarding Tier 2
async function canAwardTier2(referrerId, refereeId) {
    // Check if same IP registered both accounts
    const referrerIp = await db.ref(`users/${referrerId}/registrationIp`).once('value');
    const refereeIp = await db.ref(`users/${refereeId}/registrationIp`).once('value');
    
    if (referrerIp.val() === refereeIp.val()) {
        await flagSuspiciousReferral(referrerId, refereeId, 'same_ip');
        return false;
    }
    
    // Check if referred user has activity
    const refereeHistory = await db.ref(`users/${refereeId}/history`).once('value');
    const gamesPlayed = Object.keys(refereeHistory.val() || {}).length;
    
    if (gamesPlayed < 3) {
        return false; // Must play 3 games first
    }
    
    return true;
}
```

---

### 2.2 Fake Friend Logins

**Threat Level:** 🟠 MEDIUM  
**Potential Impact:** User creates account that only triggers referral and never engages

**Attack Scenario:**
1. User creates fake account via referral link
2. Account signs in once to trigger Tier 2
3. Account never used again
4. Referrer gets 50 tokens for "fake" friend

**Mitigations:**

| Control | Implementation | Status |
|---------|----------------|--------|
| **Activity threshold** | 3 games before Tier 2 | ✅ Implemented |
| **Engagement monitoring** | Track if account is "dead" | 📋 Planned |
| **Delayed payout** | 24-hour review period | 📋 Planned |

**Detection Algorithm:**

```javascript
// Flag "dead" referred accounts
async function auditReferralHealth() {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const referralCodes = await db.ref('referralCodes').once('value');
    
    referralCodes.forEach(codeSnap => {
        const code = codeSnap.val();
        const referees = code.referees || {};
        
        Object.entries(referees).forEach(async ([uid, data]) => {
            if (data.joinedAt > weekAgo) return; // Too new
            
            // Check activity
            const history = await db.ref(`users/${uid}/history`).once('value');
            const lastActive = await db.ref(`users/${uid}/lastVisit`).once('value');
            
            const gamesPlayed = Object.keys(history.val() || {}).length;
            const daysSinceActive = (Date.now() - (lastActive.val() || 0)) / (24 * 60 * 60 * 1000);
            
            if (gamesPlayed < 3 && daysSinceActive > 7) {
                // Flag as suspicious
                await db.ref(`suspiciousReferrals/${code.ownerId}/${uid}`).set({
                    reason: 'inactive_referee',
                    gamesPlayed,
                    daysSinceActive,
                    flaggedAt: Date.now()
                });
            }
        });
    });
}
```

---

### 2.3 Fraudulent Credit Card Purchases

**Threat Level:** 🔴 HIGH  
**Potential Impact:** User buys coins with stolen card, card is charged back

**Attack Scenario:**
1. User obtains stolen credit card
2. Purchases coins ($25 worth)
3. Converts coins to tokens
4. Uses tokens for hints
5. Card owner disputes charge
6. User keeps tokens/hints, you lose money + chargeback fee ($15-25)

**Mitigations Implemented:**

| Control | Implementation | Status |
|---------|----------------|--------|
| **Stripe Radar** | Built-in fraud detection | ✅ Default |
| **Purchase limits** | $50/day, $200/week | ✅ Implemented |
| **Chargeback webhook** | Auto-deduct on dispute | ✅ Implemented |
| **Account flagging** | Lock purchases after chargeback | ✅ Implemented |

**Mitigations To Add:**

| Control | Priority | Implementation |
|---------|----------|----------------|
| **Account age requirement** | High | 7 days before first purchase |
| **Email verification required** | High | Verified email only |
| **Velocity checks** | Medium | Flag unusual purchase patterns |
| **Address verification (AVS)** | Medium | Enable in Stripe |
| **3D Secure** | Medium | Require for first purchase |

**Stripe Radar Rules (configure in Stripe Dashboard):**

```
# Block high-risk countries
Block if :card_country: in ('NG', 'GH', 'PK', 'BD')

# Block if IP doesn't match card country
Review if :ip_country: != :card_country:

# Block if email is from disposable provider
Block if :email_domain: in ('mailinator.com', 'guerrillamail.com', ...)

# Block if too many attempts
Block if :total_charges_per_card_number_hourly: > 3

# Review high amounts from new customers
Review if :is_new_customer: and :amount_in_usd: > 25
```

---

### 2.4 Chargeback Handling

**Threat Level:** 🔴 HIGH  
**Current Implementation:** ✅ Webhook handler in place

**Process Flow:**

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cardholder       │     │ Stripe           │     │ Game Shelf       │
│ disputes charge  │────▶│ Creates dispute  │────▶│ Webhook fired    │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
                                              ┌──────────────────────┐
                                              │ 1. Find purchase     │
                                              │ 2. Deduct coins      │
                                              │ 3. Flag account      │
                                              │ 4. Lock purchases    │
                                              └──────────────────────┘
```

**Important Considerations:**

1. **Negative balance:** If user already spent coins, balance goes negative
2. **Token recovery:** Can't recover spent tokens (hints already delivered)
3. **Redemption block:** User with negative balance can't redeem merch
4. **Communication:** Consider notifying user about dispute

---

### 2.5 Coin Purchase Limits

**Current Implementation:**

| Limit | Value | Rationale |
|-------|-------|-----------|
| Minimum purchase | $10 | Fee economics (2.9% + $0.30) |
| Valid amounts | 10, 25, 50, 100 coins | Prevent arbitrary amounts |
| Daily max | $50 | Limit exposure per day |
| Weekly max | $200 | Limit exposure per week |
| Single purchase max | $100 | Limit single transaction |
| Min account age | 7 days (optional) | Prevent fraud from new accounts |

**Why $10 Minimum:**

| Purchase | Fee | % Lost | Net |
|----------|-----|--------|-----|
| $5 | $0.45 | 9% | ❌ Too much |
| $10 | $0.59 | 6% | ✅ Acceptable |
| $25 | $1.03 | 4% | ✅ Good |
| $50 | $1.75 | 3.5% | ✅ Best |

---

### 2.6 Merch Store Redemption Limits

**Threat Level:** 🟠 MEDIUM  
**Attack:** User accumulates coins, redeems expensive item, then chargesback

**Mitigations:**

| Control | Value | Rationale |
|---------|-------|-----------|
| **Redemption cooldown** | 24 hours | Prevents rapid redemption |
| **Physical item account age** | 30 days | Higher bar for shipping costs |
| **Verified email required** | Yes | Basic identity verification |
| **Weekly redemption cap** | $100 value | Limits loss from fraud |
| **Chargeback blacklist** | Permanent | No redemption if any chargeback |
| **Negative balance check** | Block | Can't redeem with debt |

**Implementation:**

```javascript
async function canRedeemItem(userId, item) {
    // Check chargeback history
    const flagged = await db.ref(`flaggedAccounts/${userId}`).once('value');
    if (flagged.exists() && flagged.val().reason === 'chargeback') {
        throw new Error('Account not eligible for redemption');
    }
    
    // Check for negative balance
    const wallet = await db.ref(`users/${userId}/wallet`).once('value');
    if ((wallet.val()?.coins || 0) < item.price) {
        throw new Error('Insufficient coins');
    }
    
    // Check cooldown
    const lastRedemption = await db.ref(`users/${userId}/lastRedemption`).once('value');
    if (lastRedemption.exists()) {
        const hoursSince = (Date.now() - lastRedemption.val()) / (60 * 60 * 1000);
        if (hoursSince < 24) {
            throw new Error(`Please wait ${Math.ceil(24 - hoursSince)} hours`);
        }
    }
    
    // Check account age for physical items
    if (item.category === 'physical') {
        const createdAt = await db.ref(`users/${userId}/createdAt`).once('value');
        const daysSinceCreation = (Date.now() - (createdAt.val() || 0)) / (24 * 60 * 60 * 1000);
        if (daysSinceCreation < 30) {
            throw new Error('Account must be 30 days old for physical rewards');
        }
    }
    
    return true;
}
```

---

### 2.7 Battle Wager Limits (Gambling Prevention)

**Current Implementation:** ✅ $5 max wager

**Legal Considerations:**

| Criteria | Status | Notes |
|----------|--------|-------|
| **Wager cap** | ✅ $5 max | Keeps us under gambling thresholds |
| **Skill-based** | ✅ Puzzle performance | Not pure chance |
| **No real money cashout** | ✅ Tokens only | Can't convert to cash |
| **Age verification** | ❌ Not implemented | Consider for future |

**Recommended Additional Controls:**

| Control | Priority | Implementation |
|---------|----------|----------------|
| Daily wager limit | Medium | Max 20 coins/day total wagered |
| Weekly wager limit | Medium | Max 50 coins/week total wagered |
| Loss streak protection | Low | Alert after 3 consecutive losses |

---

## 3. Database Security Rules

**Current Firebase Rules (recommended):**

```json
{
  "rules": {
    "users": {
      "$uid": {
        // Users can only read/write their own data
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        
        "wallet": {
          // Wallet can only be modified by owner
          // Server functions bypass rules
          ".write": "$uid === auth.uid",
          
          "tokens": {
            // Prevent setting tokens above 10,000 (sanity check)
            ".validate": "newData.isNumber() && newData.val() <= 10000"
          },
          "coins": {
            // Prevent setting coins above 1,000 (sanity check)
            ".validate": "newData.isNumber() && newData.val() <= 1000"
          }
        }
      }
    },
    
    "referralCodes": {
      "$code": {
        // Only owner can modify their referral code
        ".read": true,
        ".write": "!data.exists() || data.child('ownerId').val() === auth.uid",
        
        "referees": {
          "$refereeUid": {
            // Can only be written once (no modifying after set)
            ".write": "!data.exists()"
          }
        }
      }
    },
    
    "purchases": {
      // Purchases are write-only from server
      ".read": false,
      ".write": false
    },
    
    "flaggedAccounts": {
      // Only server can write
      ".read": false,
      ".write": false
    }
  }
}
```

---

## 4. Monitoring & Alerting

### Key Metrics to Track

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| New signups/day | 0-50 | >100 (possible bot) |
| Referrals per user/day | 0-5 | >10 (possible abuse) |
| Purchases per user/day | 0-2 | >5 (possible fraud) |
| Chargebacks/week | 0 | >0 (immediate review) |
| Tokens created/day | 0-5000 | >10000 (inflation) |
| Tokens burned/day | 0-5000 | Track trend |

### Alert Implementation

```javascript
// Daily monitoring function (Cloud Scheduler)
exports.dailySecurityAudit = functions.pubsub
    .schedule('0 6 * * *')  // 6 AM daily
    .onRun(async (context) => {
        const yesterday = Date.now() - (24 * 60 * 60 * 1000);
        
        // Check for unusual referral activity
        const referralCodes = await db.ref('referralCodes').once('value');
        
        const suspiciousUsers = [];
        
        referralCodes.forEach(snap => {
            const code = snap.val();
            const recentReferrals = Object.values(code.referees || {})
                .filter(r => r.joinedAt > yesterday);
            
            if (recentReferrals.length > 10) {
                suspiciousUsers.push({
                    userId: code.ownerId,
                    referrals: recentReferrals.length,
                    reason: 'high_referral_volume'
                });
            }
        });
        
        if (suspiciousUsers.length > 0) {
            // Log to security audit trail
            await db.ref('securityAudit').push({
                type: 'suspicious_referrals',
                users: suspiciousUsers,
                timestamp: Date.now()
            });
            
            // TODO: Send alert to admin
            console.warn('SECURITY ALERT: Suspicious referral activity', suspiciousUsers);
        }
    });
```

---

## 5. Incident Response Plan

### Chargeback Incident

1. **Immediate:** Webhook auto-deducts coins, flags account
2. **Within 24h:** Review transaction, check for fraud patterns
3. **If fraud confirmed:** Report to Stripe, block email domain if disposable
4. **Documentation:** Log in security audit trail

### Mass Signup Attack

1. **Detection:** Alert when signups > 100/day from single IP range
2. **Immediate:** Temporarily block suspicious IP ranges
3. **Within 1h:** Review accounts, identify patterns
4. **Cleanup:** Delete fake accounts, reverse fraudulent referrals
5. **Prevention:** Add CAPTCHA to signup flow

### Token Inflation Attack

1. **Detection:** Alert when token creation exceeds burn rate significantly
2. **Analysis:** Identify source (referrals, exploits, etc.)
3. **Mitigation:** Patch exploit, freeze affected accounts
4. **Recovery:** May need to adjust token balances

---

## 6. Security Checklist

### Before Launch

- [ ] Firebase Security Rules deployed
- [ ] Rate limits configured
- [ ] Stripe Radar rules configured
- [ ] Chargeback webhook tested
- [ ] Monitoring dashboards set up
- [ ] Alert thresholds configured
- [ ] Incident response plan documented

### Weekly Review

- [ ] Check chargeback rate
- [ ] Review flagged accounts
- [ ] Audit referral patterns
- [ ] Monitor token inflation/deflation
- [ ] Review purchase patterns

### Monthly Review

- [ ] Full security audit
- [ ] Update fraud rules based on patterns
- [ ] Review and update limits
- [ ] Test incident response

---

## 7. Summary of Controls

| Attack Vector | Primary Control | Secondary Control | Status |
|---------------|-----------------|-------------------|--------|
| Fake signups | Email verification | IP rate limit | ✅/📋 |
| Fake logins | Activity threshold | Delayed payout | ✅/📋 |
| Self-referral | Code validation | Same IP detection | ✅/📋 |
| Card fraud | Stripe Radar | Purchase limits | ✅ |
| Chargebacks | Auto-deduct webhook | Account flag | ✅ |
| Merch fraud | Redemption limits | Account age | 📋 |
| Excessive gambling | $5 wager cap | Daily limits | ✅/📋 |

**Legend:** ✅ Implemented | 📋 Planned

---

## Appendix: Disposable Email Domains to Block

```javascript
const DISPOSABLE_DOMAINS = [
    'mailinator.com',
    'guerrillamail.com',
    'tempmail.com',
    '10minutemail.com',
    'throwaway.email',
    'getnada.com',
    'maildrop.cc',
    'sharklasers.com',
    'temp-mail.org',
    'fakeinbox.com',
    'trashmail.com',
    'mytemp.email',
    'mohmal.com',
    'tempail.com',
    'tempmailaddress.com',
    'emailondeck.com',
    'yopmail.com',
    'mailnesia.com',
    'dispostable.com',
    'mintemail.com'
];
```
