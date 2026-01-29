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
 * - calculateBattleScore: Server-side battle scoring (DB trigger)
 * - checkBattleCompletion: Hourly auto-complete expired battles
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

// ============ AI HELP FUNCTION ============

/**
 * AI Help Rate Limiting (separate from hints)
 * More generous since help doesn't spoil puzzles
 */
const AI_HELP_RATE_LIMIT = {
    maxRequestsPerDay: 20
};

/**
 * Check AI Help rate limits
 */
async function checkAIHelpRateLimit(userId) {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const userRef = db.ref(`ai-help-usage/${userId}`);
    const snapshot = await userRef.once('value');
    const usage = snapshot.val() || { requests: [] };
    
    // Clean old entries
    const requests = (usage.requests || []).filter(t => t > dayAgo);
    
    if (requests.length >= AI_HELP_RATE_LIMIT.maxRequestsPerDay) {
        return { allowed: false, reason: 'daily_limit' };
    }
    
    return { allowed: true, dayCount: requests.length };
}

/**
 * Record AI Help usage
 */
async function recordAIHelpUsage(userId) {
    const userRef = db.ref(`ai-help-usage/${userId}/requests`);
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const snapshot = await userRef.once('value');
    const requests = (snapshot.val() || []).filter(t => t > dayAgo);
    requests.push(now);
    await userRef.set(requests);
}

/**
 * AI Help System Prompt
 */
const AI_HELP_SYSTEM_PROMPT = `You are the Game Shelf Help Assistant. Game Shelf is a free app that tracks daily puzzle game results (Wordle, Connections, etc.) in one place.

CORE FEATURES:
- Track 34+ games: NYT (Wordle, Connections, Strands, Mini), LinkedIn (Queens, Tango), Geography (Worldle, Globle), Game Shelf Originals (Quotle, Slate, Rungs)
- Record games by copying share text from the game and tapping "Record Game"
- Manual entry: Long-press Record Game button
- Streaks: Consecutive days playing same game. Miss a day = reset to 0. Each game has its own streak.
- AI Hints: 5 tokens each, levels 1-10. Tap the lightbulb icon. Requires sign-in.
- Battles: Multi-day competitions. Create via Hub → Battles. Types: Total Score, Most Wins, Perfect Hunter, Streak Challenge.
- Friends: Add via 8-character friend code in Hub → Friends.
- Tokens: Free currency earned through daily play, streaks, referrals. New users get 50.
- Coins: Purchased currency for premium rewards.

COMMON ISSUES:
- Clipboard not working (iOS): Tap "Allow" when iOS asks for paste permission.
- Streak didn't update: Check History to confirm game recorded. Timezone issues near midnight.
- Game not recognized: Use original share text format. Don't add extra text.
- Data not syncing: Sign out and back in. Check network.

YOUR ROLE:
- Be concise and friendly (2-4 sentences typical)
- Reference specific UI elements (e.g., "tap the Games tab", "go to Hub → Battles")
- If unsure, say so honestly
- Don't make up features
- For puzzle hints/answers, tell them to use the Hints feature (💡 button)
- For bugs, suggest Send Feedback in Help menu`;

/**
 * getAIHelp - AI-powered help for Game Shelf questions
 */
exports.getAIHelp = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to use AI Help.'
        );
    }
    
    const userId = context.auth.uid;
    
    // 2. Validate input
    const { question, hybridContext } = data;
    
    if (!question || question.trim().length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Please enter a question.'
        );
    }
    
    if (question.length > 500) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Question is too long. Please keep it under 500 characters.'
        );
    }
    
    // 3. Check rate limits
    const rateCheck = await checkAIHelpRateLimit(userId);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            'Daily help limit reached (20/day). Try again tomorrow.'
        );
    }
    
    // 4. Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error('Anthropic API key not configured');
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI Help is not configured. Please contact support.'
        );
    }
    
    // 5. Build the user prompt with hybrid context
    let userPrompt = question;
    
    if (hybridContext) {
        const contextParts = [];
        if (hybridContext.searchQuery) {
            contextParts.push(`User searched FAQ for: "${hybridContext.searchQuery}"`);
        }
        if (hybridContext.viewedFaqs && hybridContext.viewedFaqs.length > 0) {
            contextParts.push(`User viewed these FAQs: ${hybridContext.viewedFaqs.join(', ')}`);
        }
        if (contextParts.length > 0) {
            userPrompt = `[Context: ${contextParts.join('. ')}]\n\nQuestion: ${question}`;
        }
    }
    
    // 6. Call Claude API
    try {
        console.log(`AI Help request from ${userId}: "${question.substring(0, 50)}..."`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: AI_MODEL,
                max_tokens: 400,
                system: AI_HELP_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userPrompt }]
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Anthropic API error:', response.status, error);
            
            if (response.status === 429) {
                throw new Error('AI is busy. Please try again in a moment.');
            }
            throw new Error('Failed to get help. Please try again.');
        }
        
        const result = await response.json();
        const answer = result.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join('\n') || 'Sorry, I couldn\'t generate a response.';
        
        // 7. Record usage
        await recordAIHelpUsage(userId);
        
        // 8. Track analytics
        try {
            await db.ref('ai-help-analytics').push({
                userId: userId,
                question: question.substring(0, 200),
                searchQuery: hybridContext?.searchQuery || null,
                responseLength: answer.length,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('AI Help analytics tracking failed:', e);
        }
        
        // 9. Return response
        return {
            answer: answer,
            remaining: AI_HELP_RATE_LIMIT.maxRequestsPerDay - rateCheck.dayCount - 1
        };
        
    } catch (error) {
        console.error('AI Help error:', error.message);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to get help. Please try again.'
        );
    }
});

// ============ BATTLE SCORING ============

/**
 * Battle type scoring configurations
 * Mirrors client-side BATTLE_TYPES but authoritative
 */
const BATTLE_SCORING = {
    'total-score': {
        name: 'Total Score',
        // Sum all raw scores
        calculate: (dailyScores, dailyMeta, battleGames, battleDuration) => {
            return Object.values(dailyScores || {})
                .reduce((sum, s) => sum + (parseInt(s) || 0), 0);
        }
    },
    'wins': {
        name: 'Most Wins',
        // Count games won (1 point per win)
        calculate: (dailyScores, dailyMeta, battleGames, battleDuration) => {
            return Object.values(dailyMeta || {})
                .filter(m => m?.won === true).length;
        }
    },
    'perfect': {
        name: 'Perfect Hunter',
        // Count perfect scores (1 point per perfect)
        calculate: (dailyScores, dailyMeta, battleGames, battleDuration) => {
            return Object.values(dailyMeta || {})
                .filter(m => m?.perfect === true).length;
        }
    },
    'streak': {
        name: 'Streak Challenge',
        // Raw scores + bonus for each day ALL games played
        calculate: (dailyScores, dailyMeta, battleGames, battleDuration) => {
            const rawScore = Object.values(dailyScores || {})
                .reduce((sum, s) => sum + (parseInt(s) || 0), 0);
            
            // Calculate streak bonus
            // Group scores by date
            const scoresByDate = {};
            for (const key of Object.keys(dailyScores || {})) {
                const [date, gameId] = key.split('_');
                if (!scoresByDate[date]) scoresByDate[date] = new Set();
                scoresByDate[date].add(gameId);
            }
            
            // Count days where ALL battle games were played
            let completeDays = 0;
            for (const [date, gamesPlayed] of Object.entries(scoresByDate)) {
                const allGamesPlayed = battleGames.every(g => gamesPlayed.has(g));
                if (allGamesPlayed) completeDays++;
            }
            
            // Bonus: 10 points per complete day
            const streakBonus = completeDays * 10;
            
            return rawScore + streakBonus;
        }
    }
};

/**
 * Firebase trigger: Recalculate battle score when participant data changes
 * 
 * Triggers on any write to participant's dailyScores or dailyMeta
 * Recalculates score based on battle type (authoritative server-side scoring)
 */
exports.calculateBattleScore = functions.database
    .ref('battles/{battleId}/participants/{odataId}')
    .onWrite(async (change, context) => {
        const { battleId, odataId } = context.params;
        
        // If participant was deleted, nothing to do
        if (!change.after.exists()) {
            console.log(`Participant ${odataId} removed from battle ${battleId}`);
            return null;
        }
        
        const participant = change.after.val();
        const previousParticipant = change.before.val() || {};
        
        // Check if dailyScores or dailyMeta actually changed
        const scoresChanged = JSON.stringify(participant.dailyScores) !== JSON.stringify(previousParticipant.dailyScores);
        const metaChanged = JSON.stringify(participant.dailyMeta) !== JSON.stringify(previousParticipant.dailyMeta);
        
        if (!scoresChanged && !metaChanged) {
            // No score data changed, skip recalculation
            return null;
        }
        
        // Get battle details
        const battleSnapshot = await db.ref(`battles/${battleId}`).once('value');
        const battle = battleSnapshot.val();
        
        if (!battle) {
            console.error(`Battle ${battleId} not found`);
            return null;
        }
        
        // Skip if battle is completed
        if (battle.status === 'completed') {
            console.log(`Battle ${battleId} already completed, skipping score update`);
            return null;
        }
        
        const battleType = battle.type || 'total-score';
        const battleGames = battle.games || [];
        const battleDuration = battle.duration || 3;
        
        // Get scoring function
        const scoring = BATTLE_SCORING[battleType] || BATTLE_SCORING['total-score'];
        
        // Calculate new score
        const newScore = scoring.calculate(
            participant.dailyScores,
            participant.dailyMeta,
            battleGames,
            battleDuration
        );
        
        // Only update if score actually changed
        if (newScore !== participant.score) {
            console.log(`Battle ${battleId}: Updating ${odataId} score from ${participant.score} to ${newScore} (type: ${battleType})`);
            
            await change.after.ref.child('score').set(newScore);
            
            // Also update daysPlayed while we're here
            const uniqueDays = new Set(
                Object.keys(participant.dailyScores || {}).map(key => key.split('_')[0])
            );
            await change.after.ref.child('daysPlayed').set(uniqueDays.size);
        }
        
        return null;
    });

/**
 * Firebase trigger: Auto-complete battles when end date passes
 * Runs every hour to check for battles that need completion
 * 
 * Note: This is a backup - client also triggers completion on load
 */
exports.checkBattleCompletion = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
        const now = Date.now();
        
        // Get all active battles
        const battlesSnapshot = await db.ref('battles')
            .orderByChild('status')
            .equalTo('active')
            .once('value');
        
        const battles = battlesSnapshot.val() || {};
        let completedCount = 0;
        
        for (const [battleId, battle] of Object.entries(battles)) {
            if (battle.endDate && battle.endDate < now) {
                console.log(`Auto-completing battle ${battleId} (ended ${new Date(battle.endDate).toISOString()})`);
                
                // Mark as completed
                await db.ref(`battles/${battleId}/status`).set('completed');
                await db.ref(`battles/${battleId}/completedAt`).set(now);
                
                // Determine winner
                const participants = Object.entries(battle.participants || {})
                    .map(([uid, data]) => ({ odataId: uid, ...data }))
                    .sort((a, b) => (b.score || 0) - (a.score || 0));
                
                if (participants.length > 1) {
                    const winner = participants[0];
                    await db.ref(`battles/${battleId}/winner`).set({
                        odataId: winner.odataId,
                        displayName: winner.displayName,
                        score: winner.score
                    });
                }
                
                // Note: Prize distribution handled client-side when user views results
                // This ensures user's wallet is updated in their local storage
                
                completedCount++;
            }
        }
        
        console.log(`Battle completion check: ${completedCount} battles auto-completed`);
        return null;
    });

