/**
 * Game Shelf AI Hint Helper - Firebase Cloud Functions
 * 
 * This function proxies requests to the Anthropic API to provide
 * AI-powered hints for puzzle games.
 * 
 * SETUP:
 * 1. Create a .env file in the functions folder with:
 *    ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
 * 
 * 2. Or set it in Firebase Console:
 *    - Go to Firebase Console → Functions → Configuration
 *    - Add ANTHROPIC_API_KEY
 * 
 * 3. Deploy:
 *    firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.database();

// Rate limiting config
const RATE_LIMIT = {
    maxRequestsPerHour: 20,      // Per user
    maxRequestsPerDay: 50,       // Per user
    globalMaxPerMinute: 100      // Total across all users
};

// Token cost for hints
const HINT_COST = 5;

// Get Anthropic API key from environment variable
const getApiKey = () => {
    return process.env.ANTHROPIC_API_KEY;
};

// Check user's token balance
async function checkTokenBalance(userId) {
    const walletRef = db.ref(`users/${userId}/shelf/wallet/tokens`);
    const snapshot = await walletRef.once('value');
    return snapshot.val() || 0;
}

// Deduct tokens from user's wallet
async function deductTokens(userId, amount) {
    const walletRef = db.ref(`users/${userId}/shelf/wallet/tokens`);
    const snapshot = await walletRef.once('value');
    const currentTokens = snapshot.val() || 0;
    
    if (currentTokens < amount) {
        throw new Error('Insufficient tokens');
    }
    
    await walletRef.set(currentTokens - amount);
    
    // Log transaction
    await db.ref(`users/${userId}/tokenHistory`).push({
        type: 'hint',
        amount: -amount,
        balance: currentTokens - amount,
        timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    return currentTokens - amount;
}

// Check rate limits
async function checkRateLimit(userId) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const userRef = db.ref(`hint-usage/${userId}`);
    const snapshot = await userRef.once('value');
    const usage = snapshot.val() || { requests: [] };
    
    // Clean old entries
    const requests = (usage.requests || []).filter(t => t > dayAgo);
    
    // Count recent requests
    const hourCount = requests.filter(t => t > hourAgo).length;
    const dayCount = requests.length;
    
    if (hourCount >= RATE_LIMIT.maxRequestsPerHour) {
        return { allowed: false, reason: 'hourly_limit', resetIn: Math.ceil((requests.find(t => t > hourAgo) + 3600000 - now) / 60000) };
    }
    
    if (dayCount >= RATE_LIMIT.maxRequestsPerDay) {
        return { allowed: false, reason: 'daily_limit', resetIn: Math.ceil((requests[0] + 86400000 - now) / 60000) };
    }
    
    return { allowed: true, hourCount, dayCount };
}

// Record usage
async function recordUsage(userId) {
    const userRef = db.ref(`hint-usage/${userId}/requests`);
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    // Get current requests and filter old ones
    const snapshot = await userRef.once('value');
    const requests = (snapshot.val() || []).filter(t => t > dayAgo);
    
    // Add new request
    requests.push(now);
    
    // Save
    await userRef.set(requests);
}

// Track hint analytics (optional)
async function trackHintRequest(userId, gameId, level, success) {
    try {
        await db.ref('hint-analytics').push({
            userId: userId,
            gameId: gameId,
            level: level,
            success: success,
            timestamp: admin.database.ServerValue.TIMESTAMP
        });
    } catch (e) {
        console.warn('Analytics tracking failed:', e);
    }
}

// Main hint function
exports.getHint = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to use AI hints.'
        );
    }
    
    const userId = context.auth.uid;
    
    // 2. Check rate limits
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            rateCheck.reason === 'hourly_limit' 
                ? `Hourly limit reached. Try again in ${rateCheck.resetIn} minutes.`
                : `Daily limit reached. Try again tomorrow.`,
            { reason: rateCheck.reason, resetIn: rateCheck.resetIn }
        );
    }
    
    // 3. Check token balance
    const tokens = await checkTokenBalance(userId);
    if (tokens < HINT_COST) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Insufficient tokens. You have ${tokens}, need ${HINT_COST}.`,
            { tokens, required: HINT_COST, reason: 'insufficient_tokens' }
        );
    }
    
    // 4. Validate input
    const { gameId, level, prompt, systemPrompt, needsWebSearch } = data;
    
    if (!gameId || !level || !prompt || !systemPrompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields: gameId, level, prompt, systemPrompt'
        );
    }
    
    if (level < 1 || level > 10) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Hint level must be between 1 and 10'
        );
    }
    
    // 4. Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error('Anthropic API key not configured');
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI hints are not configured. Please contact support.'
        );
    }
    
    // 5. Make Anthropic API request
    try {
        // Build request body - only include web_search tool if needed
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
        };
        
        // Only add web_search tool for games that need it (NYT games, Quotle)
        // Rungs and Slate have all data locally, so skip web search for speed
        if (needsWebSearch !== false) {
            requestBody.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
        }
        
        console.log(`Hint request: game=${gameId}, level=${level}, webSearch=${needsWebSearch !== false}`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Anthropic API error:', response.status, error);
            
            // More specific error messages based on status
            let errorMessage = 'Failed to get hint from AI. Please try again.';
            if (response.status === 429) {
                errorMessage = 'AI is busy. Please try again in a moment.';
            } else if (response.status === 500 || response.status === 503) {
                errorMessage = 'AI service temporarily unavailable. Retrying...';
            } else if (response.status === 401) {
                errorMessage = 'AI configuration error. Please contact support.';
            }
            
            throw new functions.https.HttpsError('internal', errorMessage);
        }
        
        const result = await response.json();
        
        // Extract text from response (handle both with and without tool use)
        const hint = result.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join('\n')?.trim() || 'Unable to generate hint.';
        
        // Log success for monitoring
        console.log(`Hint generated: game=${gameId}, level=${level}, length=${hint.length}`);
        
        // Check if hint seems too short or empty
        if (hint.length < 5) {
            console.warn('Very short hint generated:', hint);
        }
        
        // 6. Deduct tokens
        const newBalance = await deductTokens(userId, HINT_COST);
        console.log(`Deducted ${HINT_COST} tokens from user ${userId}, new balance: ${newBalance}`);
        
        // 7. Record usage
        await recordUsage(userId);
        
        // 8. Track analytics
        await trackHintRequest(userId, gameId, level, true);
        
        // 9. Return result
        return {
            hint: hint,
            tokensUsed: HINT_COST,
            tokensRemaining: newBalance,
            usage: {
                hourCount: rateCheck.hourCount + 1,
                dayCount: rateCheck.dayCount + 1,
                hourLimit: RATE_LIMIT.maxRequestsPerHour,
                dayLimit: RATE_LIMIT.maxRequestsPerDay
            }
        };
        
    } catch (error) {
        console.error('Hint generation error:', error);
        await trackHintRequest(userId, gameId, level, false);
        
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        
        throw new functions.https.HttpsError(
            'internal',
            'An unexpected error occurred. Please try again.'
        );
    }
});

// Get user's hint usage stats
exports.getHintUsage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const userId = context.auth.uid;
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const snapshot = await db.ref(`hint-usage/${userId}/requests`).once('value');
    const requests = (snapshot.val() || []).filter(t => t > dayAgo);
    
    return {
        hourCount: requests.filter(t => t > hourAgo).length,
        dayCount: requests.length,
        hourLimit: RATE_LIMIT.maxRequestsPerHour,
        dayLimit: RATE_LIMIT.maxRequestsPerDay
    };
});

// ============ COIN PURCHASE SYSTEM ============

// Purchase limits for security
const PURCHASE_LIMITS = {
    minCoins: 10,                      // Minimum 10 coins ($10)
    maxCoins: 100,                     // Maximum 100 coins per purchase
    weeklyMax: 5000,                   // $50/week in cents
    minAccountAge: 7 * 24 * 60 * 60 * 1000  // 7 days for purchases (optional)
};

// Check purchase limits
async function checkPurchaseLimits(userId, amountCents) {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Coin purchases are not yet available.'
        );
    }
    
    // Validate amount (10-100 coins = $10-$100)
    const coinAmount = amountCents / 100;
    if (coinAmount < PURCHASE_LIMITS.minCoins || coinAmount > PURCHASE_LIMITS.maxCoins) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            `Coin amount must be between ${PURCHASE_LIMITS.minCoins} and ${PURCHASE_LIMITS.maxCoins}`
        );
    }
    
    // Check account age (optional - can be enabled later)
    // const userRef = await db.ref(`users/${userId}/createdAt`).once('value');
    // const createdAt = userRef.val() || Date.now();
    // if (Date.now() - createdAt < PURCHASE_LIMITS.minAccountAge) {
    //     throw new functions.https.HttpsError(
    //         'failed-precondition',
    //         'Account must be at least 7 days old to purchase coins'
    //     );
    // }
    
    // Check weekly limit
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const purchasesRef = db.ref(`purchases/${userId}`);
    const snapshot = await purchasesRef.orderByChild('timestamp').startAt(weekAgo).once('value');
    
    let weeklyTotal = 0;
    snapshot.forEach(snap => {
        weeklyTotal += snap.val().priceCents || 0;
    });
    
    if (weeklyTotal + amountCents > PURCHASE_LIMITS.weeklyMax) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Weekly purchase limit reached ($${(PURCHASE_LIMITS.weeklyMax / 100).toFixed(2)})`
        );
    }
    
    return true;
}

// Create Stripe checkout session
exports.createCoinCheckout = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { coinAmount, successUrl, cancelUrl } = data;
    const userId = context.auth.uid;
    const priceInCents = coinAmount * 100; // $1 per coin
    
    // Check limits
    await checkPurchaseLimits(userId, priceInCents);
    
    // Initialize Stripe (lazy load)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${coinAmount} Game Shelf Coins`,
                        description: `In-app currency for Game Shelf`
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
        
    } catch (error) {
        console.error('Stripe checkout error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to create checkout session. Please try again.'
        );
    }
});

// Stripe webhook to fulfill purchase
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    
    // Handle checkout completion
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const coinAmount = parseInt(session.metadata.coinAmount);
        
        console.log(`Processing purchase: user=${userId}, coins=${coinAmount}`);
        
        try {
            // Add coins to user's wallet
            const walletRef = db.ref(`users/${userId}/shelf/wallet`);
            const walletSnap = await walletRef.once('value');
            const wallet = walletSnap.val() || { tokens: 0, coins: 0 };
            
            await walletRef.update({
                coins: (wallet.coins || 0) + coinAmount
            });
            
            // Log purchase
            await db.ref(`purchases/${userId}`).push({
                type: 'coins',
                coinAmount: coinAmount,
                priceCents: coinAmount * 100,
                stripeSessionId: session.id,
                stripePaymentIntent: session.payment_intent,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
            
            // Check if this is user's first purchase (for referral reward)
            const purchaseSnap = await db.ref(`purchases/${userId}`).once('value');
            const purchaseCount = purchaseSnap.numChildren();
            
            if (purchaseCount === 1) {
                await triggerReferralPurchaseReward(userId);
            }
            
            console.log(`Added ${coinAmount} coins to user ${userId}`);
            
        } catch (error) {
            console.error('Error fulfilling purchase:', error);
            // Don't return error - Stripe will retry
        }
    }
    
    // Handle chargebacks/disputes
    if (event.type === 'charge.dispute.created') {
        const dispute = event.data.object;
        const paymentIntent = dispute.payment_intent;
        
        console.log(`Processing dispute: payment_intent=${paymentIntent}`);
        
        try {
            // Find the purchase by payment intent
            const allPurchasesRef = db.ref('purchases');
            const snapshot = await allPurchasesRef.once('value');
            
            snapshot.forEach(userPurchases => {
                const userId = userPurchases.key;
                userPurchases.forEach(purchaseSnap => {
                    const purchase = purchaseSnap.val();
                    if (purchase.stripePaymentIntent === paymentIntent) {
                        // Deduct coins (or set negative balance as debt)
                        db.ref(`users/${userId}/shelf/wallet/coins`).transaction(coins => {
                            return (coins || 0) - purchase.coinAmount;
                        });
                        
                        // Flag account
                        db.ref(`flaggedAccounts/${userId}`).set({
                            reason: 'chargeback',
                            disputeId: dispute.id,
                            amount: purchase.coinAmount,
                            timestamp: Date.now()
                        });
                        
                        // Lock from future purchases
                        db.ref(`users/${userId}/purchaseLocked`).set(true);
                        
                        console.log(`Chargeback processed: user=${userId}, coins=-${purchase.coinAmount}`);
                    }
                });
            });
            
        } catch (error) {
            console.error('Error processing chargeback:', error);
        }
    }
    
    res.json({ received: true });
});

// Award referrer when referred user makes first purchase
async function triggerReferralPurchaseReward(userId) {
    try {
        // Get user's referral data from their local storage sync
        const userRef = await db.ref(`users/${userId}`).once('value');
        const userData = userRef.val();
        
        // Check if user was referred
        const refCode = userData?.referral?.referredBy;
        if (!refCode) {
            console.log(`User ${userId} was not referred, skipping purchase reward`);
            return;
        }
        
        // Look up referrer
        const referrerSnap = await db.ref(`referralCodes/${refCode}`).once('value');
        const referrerData = referrerSnap.val();
        if (!referrerData) {
            console.log(`Referrer code ${refCode} not found`);
            return;
        }
        
        // Check if already awarded for this user's purchase
        const refereeData = referrerData.referees?.[userId];
        if (refereeData?.purchaseRewarded) {
            console.log(`Purchase reward already given for user ${userId}`);
            return;
        }
        
        // Mark as rewarded
        await db.ref(`referralCodes/${refCode}/referees/${userId}`).update({
            purchaseRewarded: true,
            purchasedAt: Date.now()
        });
        
        // Queue reward for referrer (100 tokens for tier 3)
        await db.ref(`users/${referrerData.ownerId}/pendingReferralRewards`).push({
            type: 'purchased',
            tokens: 100,
            fromUid: userId,
            fromName: userData?.displayName || 'A friend',
            timestamp: Date.now()
        });
        
        console.log(`Awarded referral purchase bonus to ${referrerData.ownerId} for user ${userId}`);
        
    } catch (error) {
        console.error('Error triggering referral purchase reward:', error);
    }
}
