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

// Get Anthropic API key from environment variable
const getApiKey = () => {
    return process.env.ANTHROPIC_API_KEY;
};

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
    
    // 3. Validate input
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
        
        // 6. Record usage
        await recordUsage(userId);
        
        // 7. Track analytics
        await trackHintRequest(userId, gameId, level, true);
        
        // 8. Return result
        return {
            hint: hint,
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
