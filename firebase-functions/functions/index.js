/**
 * Game Shelf Firebase Cloud Functions
 * 
 * FUNCTIONS:
 * - getHint: AI-powered hints with caching
 * - getHintUsage: Rate limit status
 * - createCoinCheckout: Stripe payment
 * - stripeWebhook: Payment webhook
 * - getGiftOptions, redeemGift, getGiftHistory: Gift system
 * - resetPurchaseHistory: Dev tool
 * - dailyCacheCleanup, cleanupHintCache: Cache management
 * - completeBetaRegistration: Server-side beta signup
 * - getUserType: Get user's type for routing
 * - setUserType: Admin placeholder
 * 
 * SETUP:
 * 1. Set the Anthropic API key:
 *    firebase functions:config:set anthropic.api_key="sk-ant-..."
 * 
 * 2. Deploy:
 *    firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.database();

// ============ CONFIGURATION ============

// Rate limiting config (per user)
const RATE_LIMIT = {
    maxRequestsPerHour: 20,
    maxRequestsPerDay: 50,
    globalMaxPerMinute: 100
};

// Games that support pre-fetching all hint levels
const PREFETCH_GAMES = ['connections', 'wordle', 'strands'];

// Model configuration - Haiku has higher rate limits (50K vs 30K)
const AI_MODEL = 'claude-haiku-4-5-20251001';
const AI_MAX_TOKENS = 300;

// ============ HELPERS ============

// Get Anthropic API key from Firebase config
const getApiKey = () => {
    const config = functions.config();
    return config.anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
};

// Get today's date string (for cache keys)
const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// ============ HINT CACHING ============

// Check if a cached hint exists
async function getCachedHint(gameId, level) {
    const dateKey = getTodayKey();
    const cacheRef = db.ref(`hint-cache/${dateKey}/${gameId}/${level}`);
    const snapshot = await cacheRef.once('value');
    const cached = snapshot.val();
    
    if (cached && cached.hint) {
        console.log(`Cache HIT: ${gameId} level ${level}`);
        return cached.hint;
    }
    console.log(`Cache MISS: ${gameId} level ${level}`);
    return null;
}

// Store a hint in cache
async function cacheHint(gameId, level, hint) {
    const dateKey = getTodayKey();
    const cacheRef = db.ref(`hint-cache/${dateKey}/${gameId}/${level}`);
    await cacheRef.set({
        hint: hint,
        cachedAt: admin.database.ServerValue.TIMESTAMP
    });
    console.log(`Cached: ${gameId} level ${level}`);
}

// Check if all levels are cached for a game
async function getAllCachedHints(gameId) {
    const dateKey = getTodayKey();
    const cacheRef = db.ref(`hint-cache/${dateKey}/${gameId}`);
    const snapshot = await cacheRef.once('value');
    return snapshot.val() || {};
}

// ============ TOKEN MANAGEMENT ============

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

// ============ RATE LIMITING ============

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

// Track hint analytics
async function trackHintRequest(userId, gameId, level, success, fromCache = false) {
    try {
        await db.ref('hint-analytics').push({
            userId: userId,
            gameId: gameId,
            level: level,
            success: success,
            fromCache: fromCache,
            timestamp: admin.database.ServerValue.TIMESTAMP
        });
    } catch (e) {
        console.warn('Analytics tracking failed:', e);
    }
}

// ============ AI HINT GENERATION ============

// Generate a single hint from the AI
async function generateHintFromAI(apiKey, gameId, level, prompt, systemPrompt, needsWebSearch) {
    // Build request body
    const requestBody = {
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
    };
    
    // Only add web_search for games that need it
    if (needsWebSearch !== false) {
        requestBody.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }
    
    console.log(`AI Request: game=${gameId}, level=${level}, model=${AI_MODEL}, webSearch=${needsWebSearch !== false}`);
    
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
            errorMessage = 'AI service temporarily unavailable. Please try again.';
        } else if (response.status === 401) {
            errorMessage = 'AI configuration error. Please contact support.';
        }
        
        throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    // Extract text from response (handle both with and without tool use)
    const hint = result.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('\n')?.trim() || 'Unable to generate hint.';
    
    console.log(`AI Response: game=${gameId}, level=${level}, length=${hint.length}`);
    
    return hint;
}

// Pre-fetch all hint levels for a game (runs in background)
async function prefetchAllHints(apiKey, gameId, systemPrompt, basePrompt) {
    console.log(`Pre-fetching all hints for ${gameId}...`);
    
    const levels = [1, 2, 3, 4, 5, 6, 7];
    const existingHints = await getAllCachedHints(gameId);
    
    // Find which levels need to be generated
    const missingLevels = levels.filter(l => !existingHints[l]);
    
    if (missingLevels.length === 0) {
        console.log(`All hints already cached for ${gameId}`);
        return;
    }
    
    console.log(`Generating hints for levels: ${missingLevels.join(', ')}`);
    
    // Generate hints for all missing levels
    // We do this sequentially to avoid hitting rate limits
    for (const level of missingLevels) {
        try {
            const levelPrompt = basePrompt.replace(/LEVEL \d+\/10/g, `LEVEL ${level}/10`)
                                          .replace(/level \d+/gi, `level ${level}`);
            
            const hint = await generateHintFromAI(apiKey, gameId, level, levelPrompt, systemPrompt, true);
            await cacheHint(gameId, level, hint);
            
            // Small delay between requests to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            console.error(`Failed to pre-fetch level ${level}:`, err.message);
            // Continue with other levels even if one fails
        }
    }
    
    console.log(`Pre-fetch complete for ${gameId}`);
}

// ============ MAIN HINT FUNCTION ============

exports.getHint = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to use AI hints.'
        );
    }
    
    const userId = context.auth.uid;
    
    // 2. Validate input
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
    
    // 3. Check for cached hint FIRST (before rate limiting)
    // This allows cached hints to be served even if user hit rate limit
    const cachedHint = await getCachedHint(gameId, level);
    if (cachedHint) {
        // Track analytics (cached hit)
        await trackHintRequest(userId, gameId, level, true, true);
        
        return {
            hint: cachedHint,
            cached: true
        };
    }
    
    // 4. Check rate limits (only for uncached hints)
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
    
    // 5. Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error('Anthropic API key not configured');
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI hints are not configured. Please contact support.'
        );
    }
    
    // 6. Generate the hint
    try {
        const hint = await generateHintFromAI(apiKey, gameId, level, prompt, systemPrompt, needsWebSearch);
        
        // 7. Cache the hint for other users
        await cacheHint(gameId, level, hint);
        
        // 8. Record usage (only for uncached, successful requests)
        await recordUsage(userId);
        
        // 9. Track analytics
        await trackHintRequest(userId, gameId, level, true, false);
        
        // 10. Trigger pre-fetch for prefetchable games (runs in background)
        if (PREFETCH_GAMES.includes(gameId)) {
            // Don't await - let it run in background
            prefetchAllHints(apiKey, gameId, systemPrompt, prompt)
                .catch(err => console.error('Prefetch failed:', err.message));
        }
        
        // 11. Return the hint
        return {
            hint: hint,
            cached: false,
            remaining: {
                hour: RATE_LIMIT.maxRequestsPerHour - rateCheck.hourCount - 1,
                day: RATE_LIMIT.maxRequestsPerDay - rateCheck.dayCount - 1
            }
        };
        
    } catch (error) {
        console.error('Hint generation error:', error.message);
        
        // Track failed request
        await trackHintRequest(userId, gameId, level, false, false);
        
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to get hint from AI. Please try again.'
        );
    }
});

// ============ USAGE TRACKING FUNCTION ============

exports.getHintUsage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in.'
        );
    }
    
    const userId = context.auth.uid;
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const userRef = db.ref(`hint-usage/${userId}`);
    const snapshot = await userRef.once('value');
    const usage = snapshot.val() || { requests: [] };
    
    const requests = (usage.requests || []).filter(t => t > dayAgo);
    const hourCount = requests.filter(t => t > hourAgo).length;
    const dayCount = requests.length;
    
    return {
        hourly: {
            used: hourCount,
            limit: RATE_LIMIT.maxRequestsPerHour,
            remaining: Math.max(0, RATE_LIMIT.maxRequestsPerHour - hourCount)
        },
        daily: {
            used: dayCount,
            limit: RATE_LIMIT.maxRequestsPerDay,
            remaining: Math.max(0, RATE_LIMIT.maxRequestsPerDay - dayCount)
        }
    };
});

// ============ STRIPE FUNCTIONS ============

// Lazy-initialize Stripe to avoid errors when config isn't set
let stripeInstance = null;
const getStripe = () => {
    if (!stripeInstance) {
        const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured');
        }
        stripeInstance = require('stripe')(secretKey);
    }
    return stripeInstance;
};

// Token packages
const TOKEN_PACKAGES = {
    'tokens_100': { tokens: 100, price: 199 },      // $1.99
    'tokens_500': { tokens: 500, price: 799 },      // $7.99
    'tokens_1200': { tokens: 1200, price: 1499 }    // $14.99
};

// Create checkout session
exports.createCoinCheckout = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { packageId, successUrl, cancelUrl } = data;
    const pkg = TOKEN_PACKAGES[packageId];
    
    if (!pkg) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid package');
    }
    
    try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `${pkg.tokens} Game Shelf Tokens` },
                    unit_amount: pkg.price
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl || 'https://gameshelf.co/?purchase=success',
            cancel_url: cancelUrl || 'https://gameshelf.co/?purchase=cancelled',
            metadata: {
                userId: context.auth.uid,
                packageId: packageId,
                tokens: pkg.tokens.toString()
            }
        });
        
        return { sessionId: session.id, url: session.url };
    } catch (error) {
        console.error('Stripe error:', error);
        throw new functions.https.HttpsError('internal', 'Payment setup failed');
    }
});

// Stripe webhook handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, tokens } = session.metadata;
        
        if (userId && tokens) {
            const tokenAmount = parseInt(tokens, 10);
            const walletRef = db.ref(`users/${userId}/shelf/wallet/tokens`);
            const snapshot = await walletRef.once('value');
            const currentTokens = snapshot.val() || 0;
            await walletRef.set(currentTokens + tokenAmount);
            
            // Log transaction
            await db.ref(`users/${userId}/tokenHistory`).push({
                type: 'purchase',
                amount: tokenAmount,
                balance: currentTokens + tokenAmount,
                sessionId: session.id,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
            
            console.log(`Added ${tokenAmount} tokens to user ${userId}`);
        }
    }
    
    res.json({ received: true });
});

// ============ GIFT FUNCTIONS ============

exports.getGiftOptions = functions.https.onCall(async (data, context) => {
    return {
        packages: Object.entries(TOKEN_PACKAGES).map(([id, pkg]) => ({
            id,
            tokens: pkg.tokens,
            price: pkg.price / 100,
            priceDisplay: `$${(pkg.price / 100).toFixed(2)}`
        }))
    };
});

exports.redeemGift = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError('invalid-argument', 'Gift code required');
    }
    
    const giftRef = db.ref(`gift-codes/${code}`);
    const snapshot = await giftRef.once('value');
    const gift = snapshot.val();
    
    if (!gift) {
        throw new functions.https.HttpsError('not-found', 'Invalid gift code');
    }
    
    if (gift.redeemed) {
        throw new functions.https.HttpsError('already-exists', 'Code already redeemed');
    }
    
    // Redeem the gift
    await giftRef.update({
        redeemed: true,
        redeemedBy: context.auth.uid,
        redeemedAt: admin.database.ServerValue.TIMESTAMP
    });
    
    // Add tokens
    const walletRef = db.ref(`users/${context.auth.uid}/shelf/wallet/tokens`);
    const walletSnapshot = await walletRef.once('value');
    const currentTokens = walletSnapshot.val() || 0;
    await walletRef.set(currentTokens + gift.tokens);
    
    // Log transaction
    await db.ref(`users/${context.auth.uid}/tokenHistory`).push({
        type: 'gift',
        amount: gift.tokens,
        balance: currentTokens + gift.tokens,
        giftCode: code,
        timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    return { tokens: gift.tokens, newBalance: currentTokens + gift.tokens };
});

exports.getGiftHistory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const historyRef = db.ref(`users/${context.auth.uid}/tokenHistory`);
    const snapshot = await historyRef.orderByChild('timestamp').limitToLast(50).once('value');
    
    const history = [];
    snapshot.forEach(child => {
        history.unshift({ id: child.key, ...child.val() });
    });
    
    return { history };
});

exports.resetPurchaseHistory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    await db.ref(`users/${context.auth.uid}/tokenHistory`).remove();
    return { success: true };
});

// ============ CACHE CLEANUP ============

// Scheduled daily cleanup - runs at 3am ET every day
// Keeps today and yesterday, deletes everything older
exports.dailyCacheCleanup = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        console.log('Running scheduled hint cache cleanup...');
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayKey = getTodayKey();
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        // Get all cache date keys
        const cacheRef = db.ref('hint-cache');
        const snapshot = await cacheRef.once('value');
        const cacheData = snapshot.val();
        
        if (!cacheData) {
            console.log('No cache data to clean');
            return null;
        }
        
        // Delete any date key that isn't today or yesterday
        const keysToKeep = [todayKey, yesterdayKey];
        const deletedKeys = [];
        
        for (const dateKey of Object.keys(cacheData)) {
            if (!keysToKeep.includes(dateKey)) {
                await db.ref(`hint-cache/${dateKey}`).remove();
                deletedKeys.push(dateKey);
            }
        }
        
        console.log(`Cache cleanup complete. Kept: ${keysToKeep.join(', ')}. Deleted: ${deletedKeys.length > 0 ? deletedKeys.join(', ') : 'none'}`);
        return null;
    });

// Manual cleanup endpoint (for testing or manual triggers)
exports.cleanupHintCache = functions.https.onRequest(async (req, res) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayKey = getTodayKey();
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    // Get all cache date keys
    const cacheRef = db.ref('hint-cache');
    const snapshot = await cacheRef.once('value');
    const cacheData = snapshot.val();
    
    if (!cacheData) {
        return res.json({ message: 'No cache data to clean', deleted: [] });
    }
    
    // Delete any date key that isn't today or yesterday
    const keysToKeep = [todayKey, yesterdayKey];
    const deletedKeys = [];
    
    for (const dateKey of Object.keys(cacheData)) {
        if (!keysToKeep.includes(dateKey)) {
            await db.ref(`hint-cache/${dateKey}`).remove();
            deletedKeys.push(dateKey);
        }
    }
    
    res.json({ 
        kept: keysToKeep, 
        deleted: deletedKeys,
        message: `Cleaned ${deletedKeys.length} old cache entries`
    });
});

// ============ BETA REGISTRATION ============

// User type constants
const USER_TYPES = {
    PENDING: 'pending',   // Authenticated but hasn't completed beta registration
    BETA: 'beta',         // Completed beta registration
    STANDARD: 'standard'  // Regular user (future use)
};

const BETA_SIGNUP_BONUS = 20;
const BETA_REFERRAL_BONUS = 10;

// Generate odometerId from Firebase UID (must match client-side)
function generateOdometerId(uid) {
    let h = 0;
    for (let i = 0; i < uid.length; i++) {
        h = ((h << 5) - h) + uid.charCodeAt(i);
        h = h & h;
    }
    return 'GS' + Math.abs(h).toString(36).toUpperCase().padStart(8, '0');
}

/**
 * Complete beta registration for a user
 * - Checks user isn't already beta/standard
 * - Awards signup bonus (and referral bonus if applicable)
 * - Sets userType to 'beta'
 */
exports.completeBetaRegistration = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const odometerId = generateOdometerId(uid);
    const userRef = db.ref(`users/${odometerId}`);
    
    try {
        // 2. Get current user data
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};
        
        // 3. Check if already beta (can't re-register)
        if (userData.userType === USER_TYPES.BETA) {
            return { 
                success: true, 
                message: 'Already a beta user', 
                alreadyBeta: true,
                userType: USER_TYPES.BETA
            };
        }
        
        // 4. Check if standard user (can't join beta)
        if (userData.userType === USER_TYPES.STANDARD) {
            throw new functions.https.HttpsError('failed-precondition', 'Standard users cannot join beta from this page');
        }
        
        // 5. Check for legacy beta user (has earlyAccess but no userType)
        if (userData.earlyAccess?.joinedAt && !userData.userType) {
            // Just set the type, don't award coins again
            await userRef.update({ userType: USER_TYPES.BETA });
            console.log(`Migrated legacy beta user: ${odometerId}`);
            return { 
                success: true, 
                message: 'Welcome back! Your beta status has been confirmed.', 
                migrated: true,
                userType: USER_TYPES.BETA
            };
        }
        
        const now = Date.now();
        const referredBy = data.referredBy || null;
        
        // 6. Build updates
        const updates = {
            userType: USER_TYPES.BETA,
            'earlyAccess/joinedAt': now,
            'earlyAccess/source': referredBy ? 'referral' : 'beta-hub',
            'earlyAccess/initialCoinsGranted': BETA_SIGNUP_BONUS
        };
        
        let totalBonus = BETA_SIGNUP_BONUS;
        let message = '🎉 Welcome! 20 coins added!';
        
        // 7. Handle referral
        if (referredBy) {
            const referrerSnapshot = await db.ref(`users/${referredBy}`).once('value');
            const referrerData = referrerSnapshot.val();
            
            // Verify referrer is a valid beta user
            if (referrerData && (referrerData.userType === USER_TYPES.BETA || referrerData.earlyAccess?.joinedAt)) {
                totalBonus += BETA_REFERRAL_BONUS;
                updates['earlyAccess/referredBy'] = referredBy;
                updates[`tokenHistory/${now + 1}`] = {
                    type: 'referral_bonus',
                    amount: BETA_REFERRAL_BONUS,
                    currency: 'coins',
                    timestamp: now + 1,
                    description: `Referral from ${referrerData.displayName || 'a friend'}`
                };
                message = `🎉 Welcome! ${totalBonus} coins added!`;
                
                // Credit the referrer using transaction
                const referrerCoinsRef = db.ref(`users/${referredBy}/shelf/wallet/coins`);
                await referrerCoinsRef.transaction((current) => (current || 0) + BETA_REFERRAL_BONUS);
                
                // Record referrer's history
                await db.ref(`users/${referredBy}/tokenHistory/${now}`).set({
                    type: 'referral_reward',
                    amount: BETA_REFERRAL_BONUS,
                    currency: 'coins',
                    timestamp: now,
                    description: `Invited ${userData.displayName || context.auth.token.name || 'a new user'}`
                });
                
                console.log(`Referral bonus: ${referredBy} credited ${BETA_REFERRAL_BONUS} coins`);
            }
        }
        
        // 8. Award signup bonus using transaction
        const coinsRef = db.ref(`users/${odometerId}/shelf/wallet/coins`);
        await coinsRef.transaction((current) => (current || 0) + totalBonus);
        
        // 9. Record signup bonus history
        updates[`tokenHistory/${now}`] = {
            type: 'beta_signup_bonus',
            amount: BETA_SIGNUP_BONUS,
            currency: 'coins',
            timestamp: now,
            description: 'Early Access bonus'
        };
        
        // 10. Apply all updates
        await userRef.update(updates);
        
        console.log(`Beta registration complete: ${odometerId}, coins: ${totalBonus}`);
        
        return {
            success: true,
            message: message,
            coinsAwarded: totalBonus,
            userType: USER_TYPES.BETA
        };
        
    } catch (error) {
        console.error('completeBetaRegistration error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Registration failed. Please try again.');
    }
});

/**
 * Get user's current type
 * Useful for routing decisions on client
 */
exports.getUserType = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const odometerId = generateOdometerId(context.auth.uid);
    const snapshot = await db.ref(`users/${odometerId}`).once('value');
    const userData = snapshot.val() || {};
    
    let userType = userData.userType;
    
    // Check for legacy beta users without userType
    if (!userType && userData.earlyAccess?.joinedAt) {
        userType = USER_TYPES.BETA;
        // Note: Don't auto-migrate here, let completeBetaRegistration handle it
    }
    
    return { 
        userType: userType || USER_TYPES.PENDING,
        isLegacy: !userData.userType && !!userData.earlyAccess?.joinedAt
    };
});

/**
 * Admin function to set user type (for future use)
 * Could be extended to require admin auth check
 */
exports.setUserType = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const { targetUserId, newType } = data;
    
    // For now, only allow self-service pending -> beta via completeBetaRegistration
    // This is a placeholder for future admin functionality
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
});
