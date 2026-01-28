---
name: firebase-patterns
description: Firebase Realtime Database structure and patterns for Game Shelf ecosystem. Reference for user data, battles, game stats, Command Center, and authentication flows.
---

# Firebase Patterns for Game Shelf

## 🛑 CRITICAL RULES - READ FIRST

### ❌ NEVER DO THESE

| NEVER | WHY |
|-------|-----|
| Use `wallet/{id}/` path | WRONG - wallet is at `users/{id}/shelf/wallet/` |
| Use `window.firebase` | Use the initialized `firebase` or `db` variable |
| Write directly without null check | Always handle `|| 0` or `|| {}` for missing data |
| Forget `.val()` on snapshots | `snapshot.val()` gets the actual data |
| Use `.set()` when you mean `.update()` | `.set()` overwrites everything, `.update()` merges |

### ✅ ALWAYS DO THESE

| ALWAYS | WHY |
|--------|-----|
| Use transactions for wallet changes | Prevents race conditions on tokens/coins |
| Check `currentUser` before Firebase calls | Prevents auth errors |
| Use `|| 0` or `|| {}` defaults | Firebase returns null for missing paths |
| Escape user-provided data before display | Prevents XSS attacks |

---

## 📁 DATABASE STRUCTURE

```
word-boxing-default-rtdb/
├── users/
│   └── {odometerId}/
│       ├── odometer_id: string
│       ├── displayName: string        ⚠️ ESCAPE BEFORE DISPLAY
│       ├── email: string
│       ├── photoURL: string           ⚠️ VALIDATE URL BEFORE USE
│       ├── createdAt: timestamp
│       ├── lastVisit: timestamp
│       ├── games/
│       │   └── {gameId}/
│       │       ├── history: array
│       │       ├── currentStreak: number
│       │       ├── maxStreak: number
│       │       └── lastPlayed: date
│       ├── shelf/
│       │   └── wallet/                 ⚠️ CORRECT WALLET PATH
│       │       ├── tokens: number
│       │       └── coins: number
│       ├── tokenHistory/
│       ├── referral/
│       │   └── referredBy: string
│       └── settings/
├── battles/
│   └── {odometerId}/
│       └── {odometerId2}/
│           ├── status: 'pending'|'active'|'completed'
│           ├── scores: object
│           └── results: object
├── friends/
│   └── {odometerId}/
│       └── {friendId}: boolean
├── purchases/
│   └── {odometerId}/
│       └── {purchaseId}/
├── hint-usage/
│   └── {odometerId}/
│       └── requests: array[timestamp]
├── hint-analytics/
├── gameshelf-public/              (PUBLIC - no auth required)
│   └── share-texts/
├── reported-issues/
├── error-reports/
└── debug-sessions/
```

---

## 🔧 COPY-PASTE CODE PATTERNS

### Reading User Data (Safe Pattern)

```javascript
// ✅ CORRECT - with null checks
async function getUserData(userId) {
    if (!userId) return null;
    const snapshot = await db.ref(`users/${userId}`).once('value');
    return snapshot.val() || {};
}
```

### Reading Wallet (CORRECT PATH)

```javascript
// ✅ CORRECT - wallet is under users/{id}/shelf/wallet
async function getWallet(userId) {
    const walletRef = db.ref(`users/${userId}/shelf/wallet`);
    const snapshot = await walletRef.once('value');
    const wallet = snapshot.val() || {};
    return {
        tokens: wallet.tokens || 0,
        coins: wallet.coins || 0
    };
}

// ❌ WRONG - this path doesn't exist
// db.ref(`wallet/${userId}`)  // NEVER USE THIS
```

### Updating Wallet (USE TRANSACTIONS)

```javascript
// ✅ CORRECT - atomic transaction prevents race conditions
async function addTokens(userId, amount) {
    const tokensRef = db.ref(`users/${userId}/shelf/wallet/tokens`);
    await tokensRef.transaction((current) => {
        return (current || 0) + amount;
    });
}

async function deductTokens(userId, amount) {
    const tokensRef = db.ref(`users/${userId}/shelf/wallet/tokens`);
    let success = false;
    await tokensRef.transaction((current) => {
        const currentTokens = current || 0;
        if (currentTokens >= amount) {
            success = true;
            return currentTokens - amount;
        }
        return currentTokens; // Abort - insufficient funds
    });
    return success;
}

// ❌ WRONG - race condition possible
// const tokens = await getTokens();
// await setTokens(tokens + amount);
```

### Writing Data (Update vs Set)

```javascript
// ✅ CORRECT - update() merges with existing data
await db.ref(`users/${userId}/games/${gameId}`).update({
    lastPlayed: Date.now(),
    currentStreak: newStreak
});

// ⚠️ CAREFUL - set() replaces ALL data at path
await db.ref(`users/${userId}/games/${gameId}`).set({
    // This DELETES any fields not included here!
});
```

### Real-time Listener (with Cleanup)

```javascript
// ✅ CORRECT - store reference for cleanup
const gamesRef = db.ref(`users/${userId}/games`);
const callback = gamesRef.on('value', (snapshot) => {
    const games = snapshot.val() || {};
    updateUI(games);
});

// Cleanup when done
gamesRef.off('value', callback);
```

### Calling Firebase Functions

```javascript
// ✅ CORRECT - use httpsCallable
const getHint = firebase.functions().httpsCallable('getHint');
try {
    const result = await getHint({ 
        gameId: 'wordle', 
        level: 5, 
        prompt: 'Current game state...' 
    });
    return result.data.hint;
} catch (error) {
    console.error('Hint error:', error);
    return null;
}
```

---

## 🔐 FIREBASE CONFIG

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBQVwn8vOrFTzLlm2MYIPBwgZV2xR9AuhM",
    authDomain: "word-boxing.firebaseapp.com",
    databaseURL: "https://word-boxing-default-rtdb.firebaseio.com",
    projectId: "word-boxing",
    storageBucket: "word-boxing.appspot.com",
    messagingSenderId: "932356027174",
    appId: "1:932356027174:web:0c1c9eeeca785cb49a0d8f"
};
```

### Authorized Domains (Firebase Console)
```
gameshelf.co
www.gameshelf.co  
stewartdavidp-ship-it.github.io
localhost
```

---

## ⚡ FIREBASE FUNCTIONS

### Available Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `getHint` | AI hints via Claude | Yes |
| `getHintUsage` | Check rate limits | Yes |
| `createCoinCheckout` | Stripe checkout | Yes |
| `stripeWebhook` | Payment webhook | No (server-to-server) |
| `getTransactionHistory` | Wallet history | Yes |
| `resetPurchaseHistory` | Dev tool | Yes |

### Function URLs

```
Base: https://us-central1-word-boxing.cloudfunctions.net/

Callable (via SDK):
- getHint
- getHintUsage
- createCoinCheckout
- getTransactionHistory
- resetPurchaseHistory

HTTP (direct):
- stripeWebhook (Stripe calls this directly)
```

---

## 🔒 SECURITY PATTERNS

### Escaping User Data (XSS Prevention)

```javascript
// ✅ ALWAYS escape before inserting into HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Usage
element.innerHTML = `<span>${escapeHtml(user.displayName)}</span>`;

// ❌ NEVER do this
// element.innerHTML = `<span>${user.displayName}</span>`;
```

### Auth Check Before Firebase Calls

```javascript
// ✅ CORRECT - check auth first
async function saveUserData(data) {
    if (!currentUser) {
        console.warn('Not authenticated');
        return false;
    }
    await db.ref(`users/${currentUser.odometerId}`).update(data);
    return true;
}
```

---

## 📋 COMMON MISTAKES

| Mistake | Consequence | Correct Pattern |
|---------|-------------|-----------------|
| Wrong wallet path | Data never found | `users/{id}/shelf/wallet/` |
| No null check | Crashes on missing data | `snapshot.val() \|\| {}` |
| No transaction for wallet | Race conditions | Use `.transaction()` |
| No escapeHtml | XSS vulnerability | Always escape user data |
| set() instead of update() | Data loss | Use `.update()` to merge |
