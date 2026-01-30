/**
 * Game Shelf Firebase Cloud Functions
 * 
 * FUNCTIONS:
 * - getHint: AI-powered hints with caching
 * - getHintUsage: Rate limit status
 * - getDailyInsight: Post-puzzle AI analysis with caching
 * - submitInsightReaction: User reactions (fair/bs/brutal)
 * - getInsightReaction: Get user's existing reaction
 * - getMorningReview: Pre-puzzle hype preview (spoiler-free, cached, spliced per user)
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

// ============ DAILY INSIGHTS ============

// Games that support daily insights
const INSIGHT_GAMES = ['connections'];

// System prompt for puzzle analysis
const INSIGHT_SYSTEM_PROMPT = `You are a puzzle critic analyzing today's NYT Connections puzzle. Your job is to help players understand if the puzzle was fair and why it was tricky.

RESPONSE FORMAT - Use exactly this structure:
**Difficulty:** [1-5 🔥 emojis]
**Sneakiness:** [Low/Medium/High]

**The Breakdown:**
[2-4 bullet points analyzing each category - what made it easy/hard, any traps]

**Verdict:** [One sentence: was this puzzle fair? Any liberties taken?]

GUIDELINES:
- Be conversational and opinionated - take a stance
- Call out red herrings and category overlaps specifically
- Note if any category required niche knowledge
- Keep it under 150 words total
- Don't be afraid to criticize unfair puzzles
- Celebrate clever, well-constructed puzzles`;

// Check if insight is cached
async function getCachedInsight(gameId) {
    const dateKey = getTodayKey();
    const cacheRef = db.ref(`daily-insights/${dateKey}/${gameId}`);
    const snapshot = await cacheRef.once('value');
    const cached = snapshot.val();
    
    if (cached && cached.insight) {
        console.log(`Insight cache HIT: ${gameId}`);
        return {
            insight: cached.insight,
            reactions: cached.reactions || null
        };
    }
    console.log(`Insight cache MISS: ${gameId}`);
    return null;
}

// Store insight in cache
async function cacheInsight(gameId, insight) {
    const dateKey = getTodayKey();
    const cacheRef = db.ref(`daily-insights/${dateKey}/${gameId}`);
    await cacheRef.update({
        insight: insight,
        cachedAt: admin.database.ServerValue.TIMESTAMP
    });
    console.log(`Insight cached: ${gameId}`);
}

// Generate insight from AI
async function generateInsightFromAI(apiKey, gameId) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const prompt = `Search for today's NYT Connections puzzle (${dateStr}) and analyze it. Find the 16 words, the 4 categories, and their difficulty colors (yellow=easy, green, blue, purple=hard).

Then provide your analysis of this specific puzzle.`;
    
    const requestBody = {
        model: AI_MODEL,
        max_tokens: 500,
        system: INSIGHT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
    };
    
    console.log(`Generating insight for ${gameId}...`);
    
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
        throw new Error('Failed to generate insight. Please try again.');
    }
    
    const result = await response.json();
    
    const insight = result.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('\n')?.trim() || 'Unable to generate insight.';
    
    console.log(`Insight generated for ${gameId}, length=${insight.length}`);
    
    return insight;
}

/**
 * Get daily insight for a puzzle
 * Caches insights - first request generates, subsequent requests read from cache
 */
exports.getDailyInsight = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to view insights.'
        );
    }
    
    // 2. Validate input
    const { gameId } = data;
    
    if (!gameId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required field: gameId'
        );
    }
    
    if (!INSIGHT_GAMES.includes(gameId)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            `Insights not available for ${gameId}`
        );
    }
    
    // 3. Check cache first
    const cached = await getCachedInsight(gameId);
    if (cached) {
        // Track analytics
        try {
            await db.ref('insight-analytics').push({
                userId: context.auth.uid,
                gameId: gameId,
                fromCache: true,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('Insight analytics failed:', e);
        }
        
        return {
            insight: cached.insight,
            reactions: cached.reactions,
            cached: true
        };
    }
    
    // 4. Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error('Anthropic API key not configured');
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI insights are not configured. Please contact support.'
        );
    }
    
    // 5. Generate the insight
    try {
        const insight = await generateInsightFromAI(apiKey, gameId);
        
        // 6. Cache for other users
        await cacheInsight(gameId, insight);
        
        // 7. Track analytics
        try {
            await db.ref('insight-analytics').push({
                userId: context.auth.uid,
                gameId: gameId,
                fromCache: false,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('Insight analytics failed:', e);
        }
        
        // 8. Return
        return {
            insight: insight,
            reactions: null,
            cached: false
        };
        
    } catch (error) {
        console.error('Insight generation error:', error.message);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to generate insight. Please try again.'
        );
    }
});

/**
 * Submit a reaction to today's insight
 * One reaction per user per game per day
 */
exports.submitInsightReaction = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to react.'
        );
    }
    
    const userId = context.auth.uid;
    const { gameId, reaction } = data;
    
    // 2. Validate input
    if (!gameId || !reaction) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields: gameId, reaction'
        );
    }
    
    const validReactions = ['fair', 'bs', 'brutal'];
    if (!validReactions.includes(reaction)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid reaction. Must be: fair, bs, or brutal'
        );
    }
    
    const dateKey = getTodayKey();
    const insightRef = db.ref(`daily-insights/${dateKey}/${gameId}`);
    
    // 3. Check if user already reacted
    const userReactionRef = insightRef.child(`userReactions/${userId}`);
    const existingReaction = await userReactionRef.once('value');
    const previousReaction = existingReaction.val();
    
    // 4. Use transaction to update counts atomically
    await insightRef.child('reactions').transaction((current) => {
        const reactions = current || { fair: 0, bs: 0, brutal: 0 };
        
        // If changing reaction, decrement old one
        if (previousReaction && previousReaction !== reaction) {
            reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1);
        }
        
        // Increment new reaction (only if not same as previous)
        if (previousReaction !== reaction) {
            reactions[reaction] = (reactions[reaction] || 0) + 1;
        }
        
        return reactions;
    });
    
    // 5. Store user's reaction
    await userReactionRef.set(reaction);
    
    // 6. Get updated counts
    const updatedSnapshot = await insightRef.child('reactions').once('value');
    const updatedReactions = updatedSnapshot.val() || { fair: 0, bs: 0, brutal: 0 };
    
    console.log(`Reaction ${reaction} from ${userId} for ${gameId} on ${dateKey}`);
    
    return {
        success: true,
        reactions: updatedReactions,
        userReaction: reaction
    };
});

/**
 * Get user's existing reaction for today's insight
 */
exports.getInsightReaction = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        return { userReaction: null };
    }
    
    const { gameId } = data;
    if (!gameId) {
        return { userReaction: null };
    }
    
    const dateKey = getTodayKey();
    const userReactionRef = db.ref(`daily-insights/${dateKey}/${gameId}/userReactions/${context.auth.uid}`);
    const snapshot = await userReactionRef.once('value');
    
    return {
        userReaction: snapshot.val() || null
    };
});

// ============ MORNING REVIEW ============

// Games supported for morning review (generate all, splice per user)
const MORNING_REVIEW_GAMES = [
    'wordle', 'connections', 'strands', 'mini',           // NYT Core
    'linkedin-queens', 'linkedin-pinpoint',               // LinkedIn
    'quordle', 'octordle', 'waffle', 'spelling-bee'       // Indies
];

// System prompt for morning review generation
const MORNING_REVIEW_SYSTEM_PROMPT = `You are a charismatic puzzle hype person getting players excited for today's challenges. Your job is to BUILD ANTICIPATION without giving ANY strategic advantage.

TONE:
- Playful sports commentator energy
- Tease difficulty, not content
- Make people want to play, not help them win

ABSOLUTE RULES - VIOLATING THESE RUINS THE EXPERIENCE:

❌ NEVER REVEAL (for any game):
- Themes, categories, topics, or subject matter
- Word types (homophones, puns, rhymes, compound words, etc.)
- Literary/cultural references (fairy tales, movies, books, etc.)
- Letter patterns, positions, or characteristics
- Number of anything (letters, groups, connections)
- What makes something tricky (just say it IS tricky)

✅ ONLY TALK ABOUT:
- Overall difficulty feeling (breezy, crunchy, devious)
- Your emotional reaction (this one made me smile, I groaned)
- Time estimates (quick solve, might take a coffee break)
- General vibes (satisfying, frustrating, clever)

EXAMPLES - CONNECTIONS:

BAD (reveals too much):
- "Think literary, think fairy tales" ❌ (reveals theme)
- "Watch for homophones" ❌ (reveals word type)
- "One group is about food" ❌ (reveals category)
- "The purple group is tricky wordplay" ❌ (reveals mechanism)

GOOD (hypes without hints):
- "The constructor woke up devious today. Bring your A-game."
- "Smooth sailing until that last group. You'll know it when you see it."
- "I needed two cups of coffee for this one. Fair warning."
- "Deceptively simple looking. Don't get cocky."

EXAMPLES - WORDLE:

BAD:
- "No tricky letters today" ❌ (strategic hint)
- "Common word, you'll get it fast" ❌ (reveals word type)

GOOD:
- "Felt good about this one. Trust your instincts."
- "Solid Wednesday challenge. Nothing unfair."

EXAMPLES - STRANDS:

BAD:
- "Celebrity theme today" ❌ (reveals theme)
- "Look for names" ❌ (strategic hint)

GOOD:
- "The spangram clicked for me early - satisfying solve."
- "Took me a while to see the pattern. Stick with it."

Keep each game to 1-2 SHORT sentences. Be fun, be vague, be hype.

Return valid JSON only, no markdown.`;

// System prompt for personal greeting generation
const PERSONAL_GREETING_PROMPT = `You're a friendly puzzle coach checking in with a player. Based on their stats, write 1-2 SHORT sentences (max 25 words total).

Pick ONE thing to highlight - the most interesting or motivating stat. Be warm, brief, specific.

Good examples:
- "47-day Wordle streak and counting. Locked in."
- "Wordle in 2 yesterday? Show-off. Let's see an encore."
- "Connections hasn't seen you in 12 days. Just saying."
- "5 for 5 yesterday - flawless. Keep that energy."
- "3 days from a 100-day Strands streak. No pressure."
- "Back-to-back perfect Wordle scores. You're on fire."

Bad examples (too long/generic/cheesy):
- "Wow, you're doing amazing! Keep up the great work!"
- "Your dedication is truly inspiring."
- "Keep pushing forward on your puzzle journey!"

If stats are sparse or uninteresting (no streaks, no recent activity), respond with exactly: DEFAULT

Return ONLY the 1-2 sentences (or DEFAULT). No JSON, no quotes, no preamble.`;

const DEFAULT_PERSONAL_GREETING = "Let's get the day off to a great start.";

// Get date key for a specific date (today or yesterday)
const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Check if morning review is cached for a date
async function getCachedMorningReview(dateKey) {
    const cacheRef = db.ref(`morning-review/${dateKey}`);
    const snapshot = await cacheRef.once('value');
    const cached = snapshot.val();
    
    if (cached && cached.meta && cached.games) {
        console.log(`Morning Review cache HIT: ${dateKey}`);
        return cached;
    }
    console.log(`Morning Review cache MISS: ${dateKey}`);
    return null;
}

// Store morning review in cache
async function cacheMorningReview(dateKey, reviewData) {
    const cacheRef = db.ref(`morning-review/${dateKey}`);
    await cacheRef.set({
        meta: reviewData.meta,
        games: reviewData.games,
        cachedAt: admin.database.ServerValue.TIMESTAMP
    });
    console.log(`Morning Review cached: ${dateKey}`);
}

// Check if personal greeting is cached for a user/date
async function getCachedPersonalGreeting(dateKey, odometerId) {
    const cacheRef = db.ref(`morning-review/${dateKey}/personal/${odometerId}`);
    const snapshot = await cacheRef.once('value');
    const cached = snapshot.val();
    
    if (cached) {
        console.log(`Personal greeting cache HIT: ${dateKey}/${odometerId}`);
        return cached;
    }
    console.log(`Personal greeting cache MISS: ${dateKey}/${odometerId}`);
    return null;
}

// Store personal greeting in cache
async function cachePersonalGreeting(dateKey, odometerId, greeting) {
    const cacheRef = db.ref(`morning-review/${dateKey}/personal/${odometerId}`);
    await cacheRef.set(greeting);
    console.log(`Personal greeting cached: ${dateKey}/${odometerId}`);
}

// Generate personal greeting from user stats
async function generatePersonalGreeting(apiKey, userStats) {
    // DEBUG: Log what we received
    console.log('Personal greeting - userStats received:', JSON.stringify(userStats));
    
    // Check if stats are too sparse to bother with AI
    if (!userStats || Object.keys(userStats).length === 0) {
        console.log('Personal greeting - returning default: stats empty or null');
        return DEFAULT_PERSONAL_GREETING;
    }
    
    // Check if there's anything interesting in the stats
    const hasAnyStreak = Object.values(userStats).some(s => s && s.currentStreak > 1);
    const hasYesterdayActivity = Object.values(userStats).some(s => s && s.yesterdayPlayed);
    const summary = userStats._summary;
    
    console.log('Personal greeting check - hasAnyStreak:', hasAnyStreak, 'hasYesterdayActivity:', hasYesterdayActivity, 'summary:', JSON.stringify(summary));
    
    if (!hasAnyStreak && !hasYesterdayActivity && !summary?.longestActiveStreak) {
        // Nothing interesting to comment on
        return DEFAULT_PERSONAL_GREETING;
    }
    
    const prompt = `Player stats:\n${JSON.stringify(userStats, null, 2)}`;
    
    const requestBody = {
        model: AI_MODEL,
        max_tokens: 100,
        system: PERSONAL_GREETING_PROMPT,
        messages: [{ role: 'user', content: prompt }]
    };
    
    console.log('Generating personal greeting...');
    
    try {
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
            console.error('Personal greeting API error:', response.status);
            return DEFAULT_PERSONAL_GREETING;
        }
        
        const result = await response.json();
        
        // Extract text content
        const textContent = result.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join(' ')?.trim() || '';
        
        console.log(`Personal greeting response: "${textContent.substring(0, 100)}"`);
        
        // Check for DEFAULT response
        if (textContent === 'DEFAULT' || textContent.toUpperCase() === 'DEFAULT') {
            return DEFAULT_PERSONAL_GREETING;
        }
        
        // Clean up the response (remove quotes if wrapped)
        let greeting = textContent.replace(/^["']|["']$/g, '').trim();
        
        // Validate length - if too long, fall back to default
        if (greeting.length > 150) {
            console.warn('Personal greeting too long, using default');
            return DEFAULT_PERSONAL_GREETING;
        }
        
        return greeting || DEFAULT_PERSONAL_GREETING;
        
    } catch (error) {
        console.error('Personal greeting generation error:', error.message);
        return DEFAULT_PERSONAL_GREETING;
    }
}

// Generate morning review from AI
async function generateMorningReviewFromAI(apiKey, dateStr) {
    const prompt = `Today is ${dateStr}. Search for info about today's puzzles and create a SPOILER-FREE hype preview.

CRITICAL: Your snippets must NOT help players solve puzzles. Only describe your FEELINGS about difficulty.

Generate snippets for these games (return null if you can't find info):
1. Wordle (NYT)
2. Connections (NYT) - NEVER mention themes, categories, word types, or what connects anything
3. Strands (NYT) - NEVER mention the theme or what words relate to
4. Mini Crossword (NYT)
5. Queens (LinkedIn)
6. Pinpoint (LinkedIn) - NEVER mention the category or what the 5 clues relate to
7. Quordle
8. Octordle
9. Waffle
10. Spelling Bee (NYT) - NEVER mention the letters or pangram hints

Remember: Talk about HOW HARD it felt, not WHAT it contains. "This one's tricky" = good. "Think about food" = bad.

Return this exact JSON:
{
  "intro": "Energetic opening line (under 12 words, no puzzle hints)",
  "vibe": "1-5 🌶️ emojis for overall difficulty",
  "vibeLabel": "Mild | Medium | Spicy | Extra-Spicy | Volcanic",
  "games": {
    "wordle": "Difficulty vibe only, 1-2 sentences or null",
    "connections": "Difficulty vibe only, 1-2 sentences or null",
    "strands": "Difficulty vibe only, 1-2 sentences or null",
    "mini": "Difficulty vibe only, 1-2 sentences or null",
    "linkedin-queens": "Difficulty vibe only, 1-2 sentences or null",
    "linkedin-pinpoint": "Difficulty vibe only, 1-2 sentences or null",
    "quordle": "Difficulty vibe only, 1-2 sentences or null",
    "octordle": "Difficulty vibe only, 1-2 sentences or null",
    "waffle": "Difficulty vibe only, 1-2 sentences or null",
    "spelling-bee": "Difficulty vibe only, 1-2 sentences or null"
  },
  "outro": "Motivational sendoff (under 8 words)"
}`;

    const requestBody = {
        model: AI_MODEL,
        max_tokens: 1500,
        system: MORNING_REVIEW_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
    };
    
    console.log(`Generating Morning Review for ${dateStr}...`);
    
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
        throw new Error('Failed to generate morning review. Please try again.');
    }
    
    const result = await response.json();
    
    // Extract text content
    const textContent = result.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('\n')?.trim() || '';
    
    console.log(`Morning Review raw response length: ${textContent.length}`);
    
    // Parse JSON from response (handle potential markdown code blocks)
    let reviewJson;
    try {
        // Try to extract JSON from potential markdown code blocks
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            reviewJson = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('No JSON found in response');
        }
    } catch (parseError) {
        console.error('Failed to parse Morning Review JSON:', parseError.message);
        console.error('Raw content:', textContent.substring(0, 500));
        throw new Error('Failed to parse morning review response.');
    }
    
    // Validate structure
    if (!reviewJson.intro || !reviewJson.vibe || !reviewJson.games) {
        throw new Error('Invalid morning review structure');
    }
    
    console.log(`Morning Review generated with ${Object.keys(reviewJson.games).filter(g => reviewJson.games[g]).length} games`);
    
    return {
        meta: {
            intro: reviewJson.intro,
            vibe: reviewJson.vibe,
            vibeLabel: reviewJson.vibeLabel || 'Medium',
            outro: reviewJson.outro || 'Go get \'em!'
        },
        games: reviewJson.games
    };
}

/**
 * Get morning review for today (or yesterday)
 * Generates once, caches, then splices based on user's games
 * Now includes personal greeting based on user stats
 */
exports.getMorningReview = functions.https.onCall(async (data, context) => {
    // 1. Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to view the morning review.'
        );
    }
    
    const { games, date, userStats } = data;
    
    // 2. Validate games array
    if (!games || !Array.isArray(games) || games.length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'You must provide a list of games.'
        );
    }
    
    // 3. Get user's odometerId for personal greeting cache
    const userId = context.auth.uid;
    let odometerId = null;
    try {
        const odometerSnap = await db.ref(`users-private/${userId}/odometer_id`).once('value');
        odometerId = odometerSnap.val() || userId; // Fallback to uid if no odometerId
    } catch (e) {
        odometerId = userId;
    }
    
    // 4. Determine which date to fetch (today or yesterday)
    let targetDate = new Date();
    let isYesterday = false;
    
    if (date === 'yesterday') {
        targetDate.setDate(targetDate.getDate() - 1);
        isYesterday = true;
    }
    
    const dateKey = getDateKey(targetDate);
    const dateStr = targetDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    // 5. Check cache first for game snippets
    const cached = await getCachedMorningReview(dateKey);
    
    // 6. Get API key (needed for personal greeting even on cache hit)
    const apiKey = getApiKey();
    
    if (cached) {
        // Splice games based on user's shelf
        const userGames = games
            .filter(gameId => cached.games[gameId])
            .map(gameId => ({
                id: gameId,
                snippet: cached.games[gameId]
            }));
        
        // Generate or get cached personal greeting
        let personalGreeting = DEFAULT_PERSONAL_GREETING;
        if (userStats && apiKey) {
            // Check personal greeting cache first
            const cachedGreeting = await getCachedPersonalGreeting(dateKey, odometerId);
            if (cachedGreeting) {
                personalGreeting = cachedGreeting;
            } else {
                // Generate and cache
                personalGreeting = await generatePersonalGreeting(apiKey, userStats);
                await cachePersonalGreeting(dateKey, odometerId, personalGreeting);
            }
        }
        
        // Track analytics
        try {
            await db.ref('morning-review-analytics').push({
                userId: context.auth.uid,
                date: dateKey,
                gamesRequested: games.length,
                gamesReturned: userGames.length,
                hasPersonalGreeting: personalGreeting !== DEFAULT_PERSONAL_GREETING,
                fromCache: true,
                isYesterday: isYesterday,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('Morning Review analytics failed:', e);
        }
        
        return {
            date: dateKey,
            dateDisplay: dateStr,
            personalGreeting: personalGreeting,
            intro: cached.meta.intro,
            vibe: cached.meta.vibe,
            vibeLabel: cached.meta.vibeLabel,
            games: userGames,
            outro: cached.meta.outro,
            cached: true,
            isYesterday: isYesterday
        };
    }
    
    // 7. For yesterday, if not cached, we can't generate (puzzle info may be stale)
    if (isYesterday) {
        throw new functions.https.HttpsError(
            'not-found',
            'Yesterday\'s morning review is not available.'
        );
    }
    
    // 8. Need API key to generate
    if (!apiKey) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI features are not configured. Please contact support.'
        );
    }
    
    // 9. Generate the morning review
    try {
        const reviewData = await generateMorningReviewFromAI(apiKey, dateStr);
        
        // 10. Cache game snippets for other users
        await cacheMorningReview(dateKey, reviewData);
        
        // 11. Generate and cache personal greeting
        let personalGreeting = DEFAULT_PERSONAL_GREETING;
        if (userStats) {
            personalGreeting = await generatePersonalGreeting(apiKey, userStats);
            await cachePersonalGreeting(dateKey, odometerId, personalGreeting);
        }
        
        // 12. Splice games based on user's shelf
        const userGames = games
            .filter(gameId => reviewData.games[gameId])
            .map(gameId => ({
                id: gameId,
                snippet: reviewData.games[gameId]
            }));
        
        // 13. Track analytics
        try {
            await db.ref('morning-review-analytics').push({
                userId: context.auth.uid,
                date: dateKey,
                gamesRequested: games.length,
                gamesReturned: userGames.length,
                hasPersonalGreeting: personalGreeting !== DEFAULT_PERSONAL_GREETING,
                fromCache: false,
                isYesterday: false,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('Morning Review analytics failed:', e);
        }
        
        // 14. Return
        return {
            date: dateKey,
            dateDisplay: dateStr,
            personalGreeting: personalGreeting,
            intro: reviewData.meta.intro,
            vibe: reviewData.meta.vibe,
            vibeLabel: reviewData.meta.vibeLabel,
            games: userGames,
            outro: reviewData.meta.outro,
            cached: false,
            isYesterday: false
        };
        
    } catch (error) {
        console.error('Morning Review generation error:', error.message);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to generate morning review. Please try again.'
        );
    }
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
        console.log('Running scheduled cache cleanup...');
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayKey = getTodayKey();
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        // ============ HINT CACHE (keep 2 days) ============
        const cacheRef = db.ref('hint-cache');
        const snapshot = await cacheRef.once('value');
        const cacheData = snapshot.val();
        
        let hintDeletedKeys = [];
        if (cacheData) {
            const keysToKeep = [todayKey, yesterdayKey];
            
            for (const dateKey of Object.keys(cacheData)) {
                if (!keysToKeep.includes(dateKey)) {
                    await db.ref(`hint-cache/${dateKey}`).remove();
                    hintDeletedKeys.push(dateKey);
                }
            }
        }
        
        // ============ MORNING REVIEW (keep 7 days) ============
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const morningReviewRef = db.ref('morning-review');
        const mrSnapshot = await morningReviewRef.once('value');
        const mrData = mrSnapshot.val();
        
        let mrDeletedKeys = [];
        if (mrData) {
            for (const dateKey of Object.keys(mrData)) {
                // Parse date key (YYYY-MM-DD)
                const [year, month, day] = dateKey.split('-').map(Number);
                const entryDate = new Date(year, month - 1, day);
                
                if (entryDate < weekAgo) {
                    await db.ref(`morning-review/${dateKey}`).remove();
                    mrDeletedKeys.push(dateKey);
                }
            }
        }
        
        console.log(`Cache cleanup complete.`);
        console.log(`  Hint cache - Kept: ${todayKey}, ${yesterdayKey}. Deleted: ${hintDeletedKeys.length > 0 ? hintDeletedKeys.join(', ') : 'none'}`);
        console.log(`  Morning review - Kept last 7 days. Deleted: ${mrDeletedKeys.length > 0 ? mrDeletedKeys.join(', ') : 'none'}`);
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
 * AI Help System Prompt v2.0
 * Updated: January 29, 2026
 * Comprehensive coverage of all Game Shelf features
 */
const AI_HELP_SYSTEM_PROMPT = `You are the Game Shelf Help Assistant. Help with the Game Shelf app and supported puzzle games.

CRITICAL - NAVIGATION BUTTONS:
When your answer involves going somewhere or doing something, include ONE action button at the END.
Format: [ACTION:functionName:param|Button Label]

Available actions:
- switchTab:home/games/stats/hub/share - Main tabs
- switchGamesTab:shelf/discover - Games subtabs  
- switchStatsTab:overview/bygame - Stats subtabs
- switchBattlesTab:battles/friends/activity - Battles subtabs
- switchShareTab:today/compose/history - Share subtabs
- showCreateBattle - Create Battle sheet
- showAccountSheet - Sign In / Account
- showWalletSheet - Wallet
- showAddFriendSheet - Add Friend
- showFeedbackSheet - Feedback form
- showSuggestGameSheet - Suggest a Game
- openSettings - Settings menu

EXAMPLES WITH ACTIONS:
User: "how do I add friends"
→ "Share your friend link: Battles tab → Friends → Add Friend → Share Link. When they tap it, you're connected!

[ACTION:showAddFriendSheet|Add Friend →]"

User: "where are my stats"  
→ "Stats tab shows your performance. Overview has totals, By Game breaks it down per game.

[ACTION:switchStatsTab:overview|View Stats →]"

User: "create a battle"
→ "Battles tab → Create. Name it, pick games, set duration and type, then share the invite link!

[ACTION:showCreateBattle|Create Battle →]"

User: "how do I share results"
→ "Long-press any game card → Share. Or use Share tab → Today for all games at once.

[ACTION:switchShareTab:today|Share Results →]"

RESPONSE STYLE:
- Lead with action: "Tap X → Y" not "You can find..."
- 2-4 sentences max, or 3-5 numbered steps
- Include action button when user wants to DO something
- No action button for pure info questions

APP STRUCTURE:
Tabs: Home | Games | Stats | Battles | Share
Menu (☰): Wallet, Account, Settings, Help, Rewards

KEY FEATURES:
- Record games: Copy share text from puzzle → return to Game Shelf → tap "Paste Activity"
- Import stats: Same flow! Copy stats or screenshot from any game → tap "Paste Activity" → auto-detected
- Manual entry: Long-press "Paste Activity" button
- Game cards: Tap = play, Long-press = options (stats, share, hint, remove)
- Add games: Games tab → Discover → tap + on any game
- Streaks: Consecutive days playing. Miss a day = reset to 0.
- AI Hints: 5 tokens. Game card → 💡 or long-press → Get Hint. Levels 1-10.
- Battles: Competitions with friends. Types: Total Score, Streak Challenge, Most Wins, Perfect Hunter.
- Friends: Battles tab → Friends. Share your link to connect instantly.
- Tokens: Earned free through play. Coins: Premium, purchased.

SUPPORTED GAMES (36+):
NYT: Wordle, Connections, Strands, Spelling Bee, Mini, Letterboxed, Tiles
LinkedIn: Queens, Pinpoint, Crossclimb, Tango
Other: Quordle, Octordle, Worldle, Globle, Framed, Waffle, Bandle
Originals: Quotle, Rungs, Slate, Word Boxing

BOUNDARIES:
- Puzzle answers: "Use the 💡 Hints feature on the game card! [ACTION:switchTab:home|Go to Home →]"
- Game strategy: Help freely - encouraged!
- Unsupported game: "Request it via Suggest a Game! [ACTION:showSuggestGameSheet|Suggest Game →]"
- Bugs: "Please send feedback. [ACTION:showFeedbackSheet|Send Feedback →]"
- Off-topic: "I only help with Game Shelf and supported puzzle games."`;

/**
 * Build contextual prompt with user context and FAQ content
 */
function buildContextualPrompt(question, hybridContext) {
    const contextParts = [];
    
    // User's current location in app
    if (hybridContext.currentTab) {
        let location = `User is on: ${hybridContext.currentTab} tab`;
        if (hybridContext.currentSubtab) {
            location += ` → ${hybridContext.currentSubtab}`;
        }
        contextParts.push(location);
    }
    
    // User's shelf games (for context about what they play)
    if (hybridContext.shelfGames && hybridContext.shelfGames.length > 0) {
        contextParts.push(`User's games: ${hybridContext.shelfGames.slice(0, 6).join(', ')}`);
    }
    
    // Token balance (helpful for hint-related questions)
    if (hybridContext.tokenBalance !== undefined) {
        contextParts.push(`Tokens: ${hybridContext.tokenBalance}`);
    }
    
    // FAQ search query
    if (hybridContext.searchQuery) {
        contextParts.push(`Searched FAQ for: "${hybridContext.searchQuery}"`);
    }
    
    // Viewed FAQs
    if (hybridContext.viewedFaqs && hybridContext.viewedFaqs.length > 0) {
        contextParts.push(`Viewed FAQs: ${hybridContext.viewedFaqs.join(', ')}`);
    }
    
    // RAG-lite: Include relevant FAQ content
    let faqContext = '';
    if (hybridContext.relevantFaqs && hybridContext.relevantFaqs.length > 0) {
        faqContext = '\n\nRELEVANT FAQ CONTENT (use this to inform your answer):\n';
        hybridContext.relevantFaqs.forEach((faq, i) => {
            faqContext += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n`;
        });
    }
    
    if (contextParts.length > 0 || faqContext) {
        return `[Context: ${contextParts.join(' | ')}]${faqContext}\n\nUser Question: ${question}`;
    }
    
    return question;
}

/**
 * getAIHelp - AI-powered help for Game Shelf questions
 * Supports multi-turn conversation with messages array
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
    const { question, messages, hybridContext, isFollowup } = data;
    
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
    
    // Validate messages array if provided
    if (messages && (!Array.isArray(messages) || messages.length > 10)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid conversation history.'
        );
    }
    
    // 3. Check rate limits (each turn counts toward daily limit)
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
    
    // 5. Build messages array for Claude
    let claudeMessages = [];
    
    if (messages && messages.length > 0) {
        // Multi-turn: use provided conversation history
        // Add context only to the first user message
        claudeMessages = messages.map((msg, index) => {
            if (index === 0 && msg.role === 'user' && hybridContext && !isFollowup) {
                // First message gets full context
                return {
                    role: msg.role,
                    content: buildContextualPrompt(msg.content, hybridContext)
                };
            }
            // Subsequent messages are passed as-is (truncated for safety)
            return {
                role: msg.role,
                content: msg.content.substring(0, 1000)
            };
        });
    } else {
        // Single-turn fallback (backwards compatibility)
        const userPrompt = hybridContext 
            ? buildContextualPrompt(question, hybridContext)
            : question;
        claudeMessages = [{ role: 'user', content: userPrompt }];
    }
    
    // 6. Call Claude API
    try {
        const turnCount = messages ? Math.ceil(messages.length / 2) : 1;
        console.log(`AI Help request from ${userId}: turn=${turnCount}, followup=${!!isFollowup}, "${question.substring(0, 50)}..."`);
        
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
                messages: claudeMessages
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
        
        // 8. Track analytics (includes multi-turn info)
        try {
            const turnCount = messages ? Math.ceil(messages.length / 2) : 1;
            await db.ref('ai-help-analytics').push({
                userId: userId,
                question: question.substring(0, 200),
                searchQuery: hybridContext?.searchQuery || null,
                responseLength: answer.length,
                isFollowup: !!isFollowup,
                turnCount: turnCount,
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

