# AI Navigation Integration Spec

## Overview

Enable the AI Help assistant to provide clickable navigation buttons that take users directly to specific screens, features, or actions within Game Shelf.

**Goal:** Reduce friction between "here's how to do X" and actually doing X.

---

## User Experience

### Before (Current)
```
User: "How do I create a battle?"

AI: "To create a battle:
1. Tap Battles tab
2. Make sure 'Battles' subtab is selected
3. Tap 'Create Battle' button
4. ..."
```
User must manually navigate.

### After (With Navigation)
```
User: "How do I create a battle?"

AI: "To create a battle:
1. Tap Battles tab → Battles subtab
2. Tap 'Create Battle'
3. Name it, select games, set duration
4. Tap Create and share the link!

[Create Battle →]  ← Clickable button
```
User taps button → Create Battle sheet opens.

---

## Implementation Approach

### Phase 1: Action Tokens (Recommended Start)

**How it works:**
1. AI includes special tokens in its response
2. Client parses tokens and renders as buttons
3. Buttons call existing app functions

**Token Format:**
```
[ACTION:functionName:param|Button Label]
```

**Examples:**
```
[ACTION:showCreateBattle|Create Battle →]
[ACTION:switchTab:games|Go to Games →]
[ACTION:openGame:wordle|Open Wordle →]
[ACTION:showAccountSheet|Sign In →]
```

**Client Parsing:**
```javascript
function formatAIHelpResponse(text) {
    // Existing markdown formatting...
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Parse action tokens
    formatted = formatted.replace(
        /\[ACTION:([^|]+)\|([^\]]+)\]/g,
        (match, action, label) => {
            const [fn, param] = action.split(':');
            const paramAttr = param ? `data-param="${escapeHtml(param)}"` : '';
            return `<button class="ai-help-action-btn" data-action="${escapeHtml(fn)}" ${paramAttr}>${escapeHtml(label)}</button>`;
        }
    );
    
    return formatted;
}
```

**Button Handler:**
```javascript
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-help-action-btn')) {
        const action = e.target.dataset.action;
        const param = e.target.dataset.param;
        
        executeAIHelpAction(action, param);
        closeAIHelpSheet();
    }
});

function executeAIHelpAction(action, param) {
    const actions = {
        // Tab Navigation
        'switchTab': (tab) => switchTab(tab),
        'switchGamesTab': (subtab) => { switchTab('games'); switchGamesTab(subtab); },
        'switchStatsTab': (subtab) => { switchTab('stats'); switchStatsTab(subtab); },
        'switchBattlesTab': (subtab) => { switchTab('hub'); if(subtab) switchHubTab(subtab); },
        'switchShareTab': (subtab) => { switchTab('share'); switchShareTab(subtab); },
        
        // Sheets/Modals
        'showCreateBattle': () => showCreateBattle(),
        'showAccountSheet': () => showAccountSheet(),
        'showHelpSheet': () => showHelpSheet(),
        'showWalletSheet': () => showWalletSheet(),
        'showAddFriendSheet': () => showAddFriendSheet(),
        'showFeedbackSheet': () => showFeedbackSheet(),
        'showSuggestGameSheet': () => showSuggestGameSheet(),
        
        // Game Actions
        'openGame': (gameId) => openGame(gameId),
        'showGameHint': (gameId) => { /* find card, open hint */ },
        'showGameStats': (gameId) => showGameStats(gameId),
        
        // Settings
        'showSettings': () => openSettingsMenu(),
        'showDailyGoal': () => showDailyGoalSheet(),
    };
    
    const handler = actions[action];
    if (handler) {
        handler(param);
    } else {
        console.warn('Unknown AI action:', action);
    }
}
```

**CSS:**
```css
.ai-help-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--primary);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin: 8px 4px 4px 0;
    transition: transform 0.15s, opacity 0.15s;
}

.ai-help-action-btn:hover {
    transform: scale(1.02);
}

.ai-help-action-btn:active {
    transform: scale(0.98);
}
```

---

## System Prompt Update

Add to AI_HELP_SYSTEM_PROMPT:

```
NAVIGATION ACTIONS:
When your answer involves navigating somewhere, include an action button at the end.

Format: [ACTION:functionName:param|Button Label]

Available actions:
- switchTab:home/games/stats/hub/share - Switch main tab
- switchGamesTab:shelf/discover - Games subtab
- switchStatsTab:overview/bygame - Stats subtab  
- switchBattlesTab:battles/friends/activity - Battles subtab
- switchShareTab:today/compose/history - Share subtab
- showCreateBattle - Open Create Battle sheet
- showAccountSheet - Open sign in / account
- showWalletSheet - Open wallet/token balance
- showAddFriendSheet - Open Add Friend
- showHelpSheet - Open Help (FAQ)
- showFeedbackSheet - Open Feedback form
- showSuggestGameSheet - Open Suggest a Game
- openGame:gameId - Open a specific game (wordle, connections, etc.)
- showGameStats:gameId - Show stats for a game

RULES FOR ACTIONS:
- Only include ONE action per response (the most relevant)
- Place action at the END of your response
- Use a clear, action-oriented label like "Create Battle →" or "Go to Games →"
- Don't include action if user is just asking a question (not trying to do something)

EXAMPLES:

User: "How do I create a battle?"
Response: "To create a battle...
[ACTION:showCreateBattle|Create Battle →]"

User: "Where do I see my stats?"
Response: "Your stats are on the Stats tab...
[ACTION:switchStatsTab:overview|View Stats →]"

User: "How do I add Wordle?"
Response: "To add Wordle to your shelf...
[ACTION:openGame:wordle|Add Wordle →]"

User: "What are streaks?" 
Response: "Streaks count consecutive days..." 
(No action - just informational question)
```

---

## Phase 2: Deep Links (Future)

Once action tokens work, add URL-based deep linking for shareability.

**URL Structure:**
```
gameshelf.co/#/battles/create
gameshelf.co/#/games/discover
gameshelf.co/#/game/wordle
gameshelf.co/#/settings
gameshelf.co/#/help
```

**Router:**
```javascript
const routes = {
    '/battles/create': () => { switchTab('hub'); showCreateBattle(); },
    '/battles': () => switchTab('hub'),
    '/games/discover': () => { switchTab('games'); switchGamesTab('discover'); },
    '/games': () => switchTab('games'),
    '/game/:id': (params) => openGame(params.id),
    '/stats': () => switchTab('stats'),
    '/settings': () => openSettingsMenu(),
    '/help': () => showHelpSheet(),
    '/account': () => showAccountSheet(),
};

function handleRoute() {
    const hash = location.hash.slice(1) || '/';
    // Match route and execute...
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
```

**Benefits:**
- Shareable links ("Hey, create a battle here: gameshelf.co/#/battles/create")
- Browser back button works
- Bookmarkable screens
- Marketing landing pages can deep link

---

## Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| **Auth required** | Check auth before action, show sign-in prompt if needed |
| **Game not on shelf** | openGame should work even if not on shelf (opens in discover) |
| **Invalid game ID** | Fail gracefully, show toast "Game not found" |
| **Sheet already open** | Close current sheet before opening new one |
| **Action during loading** | Disable buttons while AI is responding |

---

## Analytics

Track action button usage:

```javascript
function executeAIHelpAction(action, param) {
    // Track analytics
    try {
        firebase.database().ref('ai-help-actions').push({
            action: action,
            param: param || null,
            question: lastAIHelpQuestion.substring(0, 100),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (e) {}
    
    // Execute action...
}
```

**Metrics to watch:**
- Which actions are used most?
- Do users complete their task after clicking?
- Are there actions we should add?

---

## Implementation Checklist

### Phase 1 (Action Tokens)
- [ ] Add CSS for `.ai-help-action-btn`
- [ ] Update `formatAIHelpResponse()` to parse tokens
- [ ] Add `executeAIHelpAction()` handler
- [ ] Add click event listener for action buttons
- [ ] Update system prompt with action instructions
- [ ] Test all action types
- [ ] Add analytics tracking

### Phase 2 (Deep Links)
- [ ] Define URL route structure
- [ ] Implement hash-based router
- [ ] Update action buttons to also set hash
- [ ] Handle direct URL access
- [ ] Test browser back/forward
- [ ] Document routes for marketing use

---

## Estimated Effort

| Phase | Effort | Value |
|-------|--------|-------|
| Phase 1 (Action Tokens) | 2-3 hours | High - immediate UX improvement |
| Phase 2 (Deep Links) | 4-6 hours | Medium - enables sharing/marketing |

---

## Recommendation

Start with Phase 1. It's low-risk, high-value, and doesn't require URL changes. Once validated, Phase 2 adds shareability.
