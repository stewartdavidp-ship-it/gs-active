# Firebase Security & Testing Implementation Guide

**Project:** Game Shelf  
**Date:** January 27, 2026  
**Firebase Project:** word-boxing (word-boxing-default-rtdb.firebaseio.com)

---

## Current State Assessment

| Area | Status | Notes |
|------|--------|-------|
| Security Rules | ⚠️ Unknown | No rules file in repo - need to verify in Console |
| App Check | ❌ Not Implemented | Critical for production |
| Auth Testing | ⚠️ Manual only | Google OAuth working |
| Emulator Suite | ❌ Not Set Up | Need for safe testing |
| Cloud Functions Tests | ❌ None | Functions deployed but untested |
| Performance Monitoring | ❌ Not Implemented | |
| Crashlytics | ❌ Not Implemented | Web SDK available |

---

## 1. Security and Access Control (CRITICAL)

### 1.1 Firebase Security Rules - PRIORITY 1

**Current Risk:** If rules are open, anyone can read/write all data.

**Step 1: Export current rules**
```bash
firebase database:rules:get > current-rules.json
```

**Step 2: Create proper rules file**

Create `database.rules.json` in project root:

```json
{
  "rules": {
    // Users can only access their own data
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        
        "shelf": {
          "wallet": {
            "tokens": {
              ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 50000"
            },
            "coins": {
              ".validate": "newData.isNumber() && newData.val() >= -100 && newData.val() <= 10000"
            }
          }
        },
        
        "displayName": {
          ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 50"
        }
      }
    },
    
    // Friends - bidirectional access
    "friends": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        
        "$friendUid": {
          ".validate": "newData.hasChildren(['odataId', 'addedAt'])"
        }
      }
    },
    
    // Referral codes - public read, owner write
    "referralCodes": {
      "$code": {
        ".read": true,
        ".write": "!data.exists() || data.child('ownerId').val() === auth.uid",
        
        "referees": {
          "$refereeUid": {
            // Can only be written once, by the referee themselves
            ".write": "!data.exists() && $refereeUid === auth.uid",
            ".validate": "newData.hasChildren(['joinedAt'])"
          }
        }
      }
    },
    
    // Battles - participants can read/write their own data
    "battles": {
      "$battleId": {
        ".read": "data.child('participants').child(auth.uid).exists() || data.child('isPublic').val() === true",
        
        "participants": {
          "$uid": {
            ".write": "$uid === auth.uid && (data.exists() || root.child('battles').child($battleId).child('status').val() !== 'completed')",
            
            "score": {
              ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000"
            }
          }
        }
      }
    },
    
    // Public battles lobby - authenticated users can read
    "public-battles": {
      ".read": "auth != null",
      "$battleId": {
        ".write": "auth != null && (!data.exists() || data.child('creatorId').val() === auth.uid)"
      }
    },
    
    // Hint usage - user can only access own data
    "hint-usage": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    
    // Purchases - server only (Cloud Functions bypass rules)
    "purchases": {
      ".read": false,
      ".write": false
    },
    
    // Flagged accounts - server only
    "flaggedAccounts": {
      ".read": false,
      ".write": false
    },
    
    // Gift redemptions - server only
    "giftRedemptions": {
      ".read": false,
      ".write": false
    },
    
    // Hint analytics - server only
    "hint-analytics": {
      ".read": false,
      ".write": false
    },
    
    // Security audit logs - server only  
    "securityAudit": {
      ".read": false,
      ".write": false
    }
  }
}
```

**Step 3: Deploy rules**
```bash
firebase deploy --only database
```

### 1.2 Security Rules Unit Testing - PRIORITY 1

**Install Firebase Emulator Suite:**
```bash
npm install -g firebase-tools
firebase init emulators
# Select: Database, Functions, Auth
```

**Create test file** `tests/security-rules.test.js`:

```javascript
const firebase = require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROJECT_ID = 'word-boxing-test';

function getDatabase(auth) {
  return firebase.initializeTestApp({
    projectId: PROJECT_ID,
    databaseName: PROJECT_ID,
    auth: auth
  }).database();
}

function getAdminDatabase() {
  return firebase.initializeAdminApp({
    projectId: PROJECT_ID,
    databaseName: PROJECT_ID
  }).database();
}

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: PROJECT_ID });
});

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()));
});

describe('User data access', () => {
  test('User can read own data', async () => {
    const db = getDatabase({ uid: 'user1' });
    const ref = db.ref('users/user1/shelf');
    await firebase.assertSucceeds(ref.once('value'));
  });

  test('User cannot read other user data', async () => {
    const db = getDatabase({ uid: 'user1' });
    const ref = db.ref('users/user2/shelf');
    await firebase.assertFails(ref.once('value'));
  });

  test('Unauthenticated user cannot read any user data', async () => {
    const db = getDatabase(null);
    const ref = db.ref('users/user1/shelf');
    await firebase.assertFails(ref.once('value'));
  });

  test('User cannot set tokens above limit', async () => {
    const db = getDatabase({ uid: 'user1' });
    const ref = db.ref('users/user1/shelf/wallet/tokens');
    await firebase.assertFails(ref.set(100000));
  });

  test('User can set valid token amount', async () => {
    const db = getDatabase({ uid: 'user1' });
    const ref = db.ref('users/user1/shelf/wallet/tokens');
    await firebase.assertSucceeds(ref.set(500));
  });
});

describe('Referral codes', () => {
  test('Anyone can read referral codes', async () => {
    const adminDb = getAdminDatabase();
    await adminDb.ref('referralCodes/ABC123').set({
      ownerId: 'user1',
      ownerName: 'Test User'
    });

    const db = getDatabase({ uid: 'user2' });
    const ref = db.ref('referralCodes/ABC123');
    await firebase.assertSucceeds(ref.once('value'));
  });

  test('User cannot modify another user referral code', async () => {
    const adminDb = getAdminDatabase();
    await adminDb.ref('referralCodes/ABC123').set({
      ownerId: 'user1'
    });

    const db = getDatabase({ uid: 'user2' });
    await firebase.assertFails(
      db.ref('referralCodes/ABC123/ownerName').set('Hacked')
    );
  });

  test('Referee can only be added once', async () => {
    const adminDb = getAdminDatabase();
    await adminDb.ref('referralCodes/ABC123').set({ ownerId: 'user1' });
    await adminDb.ref('referralCodes/ABC123/referees/user2').set({
      joinedAt: Date.now()
    });

    const db = getDatabase({ uid: 'user2' });
    await firebase.assertFails(
      db.ref('referralCodes/ABC123/referees/user2').set({
        joinedAt: Date.now(),
        bonus: 999999
      })
    );
  });
});

describe('Battles', () => {
  test('Participant can update own score', async () => {
    const adminDb = getAdminDatabase();
    await adminDb.ref('battles/battle1').set({
      status: 'active',
      participants: { user1: { score: 0 } }
    });

    const db = getDatabase({ uid: 'user1' });
    await firebase.assertSucceeds(
      db.ref('battles/battle1/participants/user1/score').set(100)
    );
  });

  test('User cannot modify other participant score', async () => {
    const adminDb = getAdminDatabase();
    await adminDb.ref('battles/battle1').set({
      status: 'active',
      participants: { 
        user1: { score: 0 },
        user2: { score: 50 }
      }
    });

    const db = getDatabase({ uid: 'user1' });
    await firebase.assertFails(
      db.ref('battles/battle1/participants/user2/score').set(0)
    );
  });
});

describe('Server-only paths', () => {
  test('User cannot read purchases', async () => {
    const db = getDatabase({ uid: 'user1' });
    await firebase.assertFails(
      db.ref('purchases/user1').once('value')
    );
  });

  test('User cannot write to flaggedAccounts', async () => {
    const db = getDatabase({ uid: 'user1' });
    await firebase.assertFails(
      db.ref('flaggedAccounts/user1').set({ reason: 'test' })
    );
  });
});
```

**Run tests:**
```bash
firebase emulators:exec --only database "npm test"
```

### 1.3 Firebase App Check - PRIORITY 1

**Why:** Prevents abuse by verifying requests come from your legitimate app.

**Step 1: Enable in Firebase Console**
1. Go to Firebase Console → App Check
2. Register your web app with reCAPTCHA v3
3. Get site key

**Step 2: Add to index.html**
```html
<!-- Add after Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-check.js"></script>

<script>
// After firebase.initializeApp(firebaseConfig)
if (typeof firebase !== 'undefined' && firebase.appCheck) {
    const appCheck = firebase.appCheck();
    appCheck.activate(
        'YOUR_RECAPTCHA_V3_SITE_KEY',
        true // Enable token auto-refresh
    );
}
</script>
```

**Step 3: Enforce in Cloud Functions**
```javascript
// In functions/index.js
const { getAppCheck } = require('firebase-admin/app-check');

exports.getHint = functions.https.onCall(async (data, context) => {
    // Verify App Check token
    if (context.app == undefined) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'App Check verification failed'
        );
    }
    // ... rest of function
});
```

### 1.4 Penetration Testing with firepwn

**Install:**
```bash
pip install firepwn
```

**Test for open rules:**
```bash
firepwn --project word-boxing-default-rtdb
```

**Manual curl tests:**
```bash
# Test unauthenticated read (should fail)
curl "https://word-boxing-default-rtdb.firebaseio.com/users.json"

# Test unauthenticated write (should fail)
curl -X PUT -d '{"hacked": true}' \
  "https://word-boxing-default-rtdb.firebaseio.com/test.json"

# Test reading another user's data (should fail)
# Get a valid token first, then:
curl "https://word-boxing-default-rtdb.firebaseio.com/users/VICTIM_UID.json?auth=ATTACKER_TOKEN"
```

---

## 2. Authentication Testing

### 2.1 Auth Flow Test Checklist

| Test Case | Expected | Status |
|-----------|----------|--------|
| Google Sign-In | User authenticated, profile loaded | ⬜ |
| Sign Out | User logged out, local data preserved | ⬜ |
| Token Refresh | Seamless re-auth after 1 hour | ⬜ |
| Auth State Persistence | Stay logged in after page refresh | ⬜ |
| Auth State on New Tab | Same user in new tab | ⬜ |
| Offline → Online Auth | Token refreshes on reconnect | ⬜ |

### 2.2 Token Expiration Testing

**Add to Game Shelf for debugging:**
```javascript
// Check token expiration
auth.currentUser.getIdTokenResult().then(tokenResult => {
    const expirationTime = new Date(tokenResult.expirationTime);
    const now = new Date();
    const minutesUntilExpiry = (expirationTime - now) / 60000;
    console.log(`Token expires in ${minutesUntilExpiry.toFixed(1)} minutes`);
});

// Force token refresh
auth.currentUser.getIdToken(true).then(token => {
    console.log('Token refreshed');
});
```

### 2.3 Auth State Change Handler

**Verify this exists in Game Shelf:**
```javascript
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        currentUser = user;
        await loadUserData();
        updateAuthUI();
    } else {
        // User is signed out
        currentUser = null;
        clearUserData();
        updateAuthUI();
    }
});
```

---

## 3. Database and Real-time Functionality

### 3.1 Real-time Listener Testing

**Test real-time updates work:**
```javascript
// In browser console on Game Shelf
const testRef = db.ref('users/' + currentUser.uid + '/shelf/testValue');

// Set up listener
testRef.on('value', (snapshot) => {
    console.log('Real-time update:', snapshot.val());
});

// In another tab, update the value
testRef.set(Date.now());

// Should see console log in first tab
```

### 3.2 Offline Persistence Testing

**Enable offline persistence:**
```javascript
// Already in Game Shelf, but verify:
firebase.database().goOffline();
// Make changes
firebase.database().goOnline();
// Verify changes sync
```

**Test checklist:**
| Scenario | Expected | Status |
|----------|----------|--------|
| Log game while offline | Queued locally | ⬜ |
| Reconnect | Data syncs to server | ⬜ |
| Conflict resolution | Last write wins | ⬜ |
| Offline read | Cached data available | ⬜ |

### 3.3 Query Performance Testing

**Add index for common queries:**

In `database.rules.json`:
```json
{
  "rules": { ... },
  "indexes": {
    "battles": {
      ".indexOn": ["status", "endDate", "creatorId"]
    },
    "public-battles": {
      ".indexOn": ["endDate", "status"]
    },
    "hint-usage": {
      "$uid": {
        ".indexOn": ["requests"]
      }
    }
  }
}
```

---

## 4. Cloud Functions Testing

### 4.1 Set Up Functions Testing

**Install test SDK:**
```bash
cd functions
npm install --save-dev firebase-functions-test mocha
```

**Create `functions/test/index.test.js`:**

```javascript
const test = require('firebase-functions-test')({
    projectId: 'word-boxing',
}, './service-account-key.json');

const admin = require('firebase-admin');
const functions = require('../index');

describe('getHint', () => {
    it('should reject unauthenticated requests', async () => {
        const wrapped = test.wrap(functions.getHint);
        
        try {
            await wrapped({ gameId: 'wordle', level: 5, prompt: 'test' });
            throw new Error('Should have thrown');
        } catch (err) {
            expect(err.code).toBe('unauthenticated');
        }
    });

    it('should reject requests without enough tokens', async () => {
        // Set up test user with 0 tokens
        await admin.database().ref('users/testuser/shelf/wallet/tokens').set(0);
        
        const wrapped = test.wrap(functions.getHint);
        const context = { auth: { uid: 'testuser' } };
        
        try {
            await wrapped({ gameId: 'wordle', level: 5, prompt: 'test' }, context);
            throw new Error('Should have thrown');
        } catch (err) {
            expect(err.code).toBe('resource-exhausted');
        }
    });

    it('should deduct tokens on success', async () => {
        await admin.database().ref('users/testuser/shelf/wallet/tokens').set(100);
        
        const wrapped = test.wrap(functions.getHint);
        const context = { auth: { uid: 'testuser' } };
        
        // Mock Anthropic API response
        // ... 
        
        const result = await wrapped({
            gameId: 'wordle',
            level: 5,
            prompt: 'test',
            systemPrompt: 'test'
        }, context);
        
        const newTokens = await admin.database()
            .ref('users/testuser/shelf/wallet/tokens')
            .once('value');
        
        expect(newTokens.val()).toBe(95); // 100 - 5
    });
});

describe('stripeWebhook', () => {
    it('should add coins on successful payment', async () => {
        // Mock Stripe webhook event
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_123',
                    metadata: {
                        userId: 'testuser',
                        coinAmount: '25'
                    },
                    payment_intent: 'pi_test_123'
                }
            }
        };
        
        // ... test implementation
    });
});
```

**Run function tests:**
```bash
cd functions
npm test
```

### 4.2 Test Token Deduction Race Condition Fix

```javascript
// Test concurrent requests
async function testRaceCondition() {
    const userId = 'testuser';
    await admin.database().ref(`users/${userId}/shelf/wallet/tokens`).set(10);
    
    // Fire 5 concurrent hint requests (each costs 5 tokens)
    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(
            functions.getHint.call({
                gameId: 'wordle',
                level: 5,
                prompt: 'test',
                systemPrompt: 'test'
            }, { auth: { uid: userId } })
        );
    }
    
    const results = await Promise.allSettled(promises);
    
    // Only 2 should succeed (10 tokens / 5 cost = 2)
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    
    console.log(`Successes: ${successes.length}, Failures: ${failures.length}`);
    // Expected: 2 successes, 3 failures
    
    const finalTokens = await admin.database()
        .ref(`users/${userId}/shelf/wallet/tokens`)
        .once('value');
    
    console.log(`Final tokens: ${finalTokens.val()}`);
    // Expected: 0 (not negative!)
}
```

---

## 5. Performance and Monitoring

### 5.1 Firebase Performance Monitoring

**Add to index.html:**
```html
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-performance.js"></script>

<script>
// After firebase.initializeApp
if (typeof firebase !== 'undefined' && firebase.performance) {
    const perf = firebase.performance();
    console.log('[Performance] Monitoring initialized');
}
</script>
```

### 5.2 Custom Performance Traces

**Add to Game Shelf:**
```javascript
// Trace game logging performance
async function logGameWithTrace(gameId, result) {
    const trace = firebase.performance().trace('log_game');
    trace.start();
    
    try {
        await saveGameResult(gameId, result);
        trace.putAttribute('game', gameId);
        trace.putAttribute('success', 'true');
    } catch (err) {
        trace.putAttribute('success', 'false');
        trace.putAttribute('error', err.message);
        throw err;
    } finally {
        trace.stop();
    }
}

// Trace hint generation
async function getHintWithTrace(gameId, level) {
    const trace = firebase.performance().trace('get_hint');
    trace.start();
    trace.putMetric('level', level);
    
    try {
        const result = await getHint(gameId, level);
        trace.putAttribute('success', 'true');
        return result;
    } catch (err) {
        trace.putAttribute('success', 'false');
        throw err;
    } finally {
        trace.stop();
    }
}
```

### 5.3 Crashlytics for Web

**Add to index.html:**
```html
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-crashlytics.js"></script>

<script>
// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    if (firebase.crashlytics) {
        firebase.crashlytics().recordError(error || new Error(message));
    }
    return false;
};

// Promise rejection handler
window.onunhandledrejection = function(event) {
    if (firebase.crashlytics) {
        firebase.crashlytics().recordError(event.reason);
    }
};

// Log custom events
function logCrashlyticsEvent(name, params) {
    if (firebase.crashlytics) {
        firebase.crashlytics().log(`${name}: ${JSON.stringify(params)}`);
    }
}
</script>
```

---

## 6. Integration and Functional Testing

### 6.1 Emulator Suite Configuration

**Create `firebase.json`:**
```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "functions": {
    "source": "functions"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "database": {
      "port": 9000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

**Start emulators:**
```bash
firebase emulators:start
```

**Connect app to emulators (dev mode):**
```javascript
if (location.hostname === 'localhost') {
    // Use emulators in development
    auth.useEmulator('http://localhost:9099');
    db.useEmulator('localhost', 9000);
    firebase.functions().useEmulator('localhost', 5001);
    console.log('[Firebase] Using local emulators');
}
```

### 6.2 End-to-End Test Scenarios

| Scenario | Steps | Expected |
|----------|-------|----------|
| New User Signup | 1. Open app 2. Sign in with Google 3. Get referral link | User created, 50 tokens, referral code generated |
| Referral Flow | 1. User A shares link 2. User B signs up via link | A gets 10 tokens, B gets friend connection |
| Game Logging | 1. Copy Wordle result 2. App detects 3. Confirm log | Game saved, streak updated, friends see activity |
| Hint Purchase | 1. Open hint 2. Click get hint 3. Wait for response | 5 tokens deducted, hint displayed |
| Battle Flow | 1. Create battle 2. Friend joins 3. Both play 4. Battle ends | Winner gets prize pool, results shown |
| Coin Purchase | 1. Click buy coins 2. Complete Stripe checkout | Coins added, receipt in history |

### 6.3 A/B Testing Ideas

| Experiment | Variants | Metric |
|------------|----------|--------|
| Hint pricing | 5 vs 3 vs 7 tokens | Hint usage rate |
| Referral bonus | 50 vs 100 tokens | Referral conversion |
| Battle duration | 3 vs 7 days | Battle completion rate |
| Onboarding flow | 3 vs 5 steps | Signup completion |

---

## Implementation Priority

### Phase 1: Critical Security (Do This Week)
1. ✅ Fix XSS vulnerabilities (DONE - v1.2.68)
2. ⬜ Deploy Firebase Security Rules
3. ⬜ Run security rules tests
4. ⬜ Enable App Check
5. ⬜ Fix token race condition in Cloud Functions

### Phase 2: Testing Infrastructure (Next 2 Weeks)
6. ⬜ Set up Firebase Emulator Suite
7. ⬜ Create Cloud Functions unit tests
8. ⬜ Add integration test suite
9. ⬜ Test offline persistence

### Phase 3: Monitoring (Next Month)
10. ⬜ Add Performance Monitoring
11. ⬜ Add Crashlytics
12. ⬜ Set up alerting dashboards
13. ⬜ Create performance baselines

### Phase 4: Polish (Ongoing)
14. ⬜ A/B testing framework
15. ⬜ App Distribution for beta testing
16. ⬜ Automated regression tests

---

## Quick Reference Commands

```bash
# Start emulators
firebase emulators:start

# Deploy security rules only
firebase deploy --only database

# Deploy functions only
firebase deploy --only functions

# Run security rules tests
firebase emulators:exec --only database "npm test"

# Check current rules
firebase database:rules:get

# View function logs
firebase functions:log

# Export data for backup
firebase database:get / > backup.json
```

---

## Resources

- [Firebase Security Rules Guide](https://firebase.google.com/docs/database/security)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [App Check Documentation](https://firebase.google.com/docs/app-check)
- [Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [Cloud Functions Testing](https://firebase.google.com/docs/functions/unit-testing)
