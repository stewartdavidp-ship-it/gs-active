# AI Help Navigation Actions - Feature Spec

## Overview

Allow AI Help to include actionable navigation buttons in responses, so users can tap directly to the relevant screen instead of manually navigating.

**Example:**
```
User: "How do I create a battle?"

AI: "To create a battle:
1. Go to the Battles tab
2. Tap Create Battle
3. Name it and select games
4. Share the invite link!

[Take me there →]  ← Tapping this opens Create Battle sheet
```

---

## Phase 1: Action Tokens (MVP)

### How It Works

1. **AI includes tokens** in response using special syntax
2. **Client parses** tokens from response text
3. **Client renders** as tappable buttons
4. **Buttons call** existing app functions

### Token Syntax

```
[ACTION:functionName|Button Label]
[ACTION:functionName:param|Button Label]
```

**Examples:**
```
[ACTION:showCreateBattle|Create a Battle →]
[ACTION:switchTab:games|Go to Games →]
[ACTION:openGame:wordle|Open Wordle →]
```

### Available Actions

| Action | Parameters | Description | Auth Required |
|--------|------------|-------------|---------------|
| `switchTab` | `home`, `games`, `stats`, `hub`, `share` | Switch to main tab | No |
| `switchSubtab` | `games:shelf`, `games:discover`, `stats:overview`, `stats:bygame`, `hub:battles`, `hub:friends`, `hub:activity`, `share:today`, `share:compose`, `share:history` | Switch to subtab | No |
| `showCreateBattle` | - | Open Create Battle sheet | Yes |
| `showAddFriend` | - | Open Add Friend sheet | Yes |
| `showAccountSheet` | - | Open Account/Sign In | No |
| `showHelpSheet` | - | Open Help | No |
| `showWalletSheet` | - | Open Wallet | No |
| `showSettingsSheet` | - | Open Settings | No |
| `openGame` | game ID (e.g., `wordle`) | Navigate to game in browser/app | No |
| `showGameHint` | game ID | Open hint sheet for specific game | Yes |
| `showManualEntry` | - | Open manual score entry | No |
| `showSuggestGame` | - | Open Suggest a Game form | No |
| `showFeedbackSheet` | - | Open Feedback form | No |

### System Prompt Addition

Add to AI Help system prompt:

```
NAVIGATION ACTIONS:
When your instructions involve navigating somewhere, include an action button at the end.
Use this exact syntax: [ACTION:functionName|Button Label]

Available actions:
- [ACTION:switchTab:games|Go to Games →]
- [ACTION:switchTab:hub|Go to Battles →]
- [ACTION:switchSubtab:games:discover|Browse Games →]
- [ACTION:switchSubtab:hub:friends|View Friends →]
- [ACTION:showCreateBattle|Create a Battle →]
- [ACTION:showAddFriend|Add a Friend →]
- [ACTION:showAccountSheet|Sign In →]
- [ACTION:showGameHint:wordle|Get Wordle Hint →]
- [ACTION:showManualEntry|Enter Score Manually →]
- [ACTION:showSuggestGame|Suggest a Game →]
- [ACTION:showFeedbackSheet|Send Feedback →]

Rules:
- Only include ONE action per response (the most relevant)
- Place at the end of your response
- Only use actions from the list above
- If auth required and user isn't signed in, the app will prompt them

Example response:
"To add a friend, go to Battles → Friends and tap the + button. Enter their 8-character friend code.

[ACTION:showAddFriend|Add a Friend →]"
```

### Client Implementation

#### 1. Parse Action Tokens

```javascript
function parseAIHelpActions(responseText) {
    const actionRegex = /\[ACTION:([^\]]+)\]/g;
    const actions = [];
    let cleanText = responseText;
    
    let match;
    while ((match = actionRegex.exec(responseText)) !== null) {
        const [fullMatch, actionContent] = match;
        const parts = actionContent.split('|');
        const actionParts = parts[0].split(':');
        
        actions.push({
            function: actionParts[0],
            param: actionParts[1] || null,
            label: parts[1] || 'Go →'
        });
        
        cleanText = cleanText.replace(fullMatch, '');
    }
    
    return { cleanText: cleanText.trim(), actions };
}
```

#### 2. Render Actions as Buttons

```javascript
function renderAIHelpActions(actions) {
    if (!actions || actions.length === 0) return '';
    
    return actions.map(action => {
        const authRequired = ['showCreateBattle', 'showAddFriend', 'showGameHint'].includes(action.function);
        const authCheck = authRequired ? `if (!currentUser) { showToast('Please sign in first', 'info'); showAccountSheet(); return; }` : '';
        
        return `
            <button class="ai-help-action-btn" onclick="${authCheck} executeAIHelpAction('${action.function}', '${action.param || ''}'); closeAIHelpSheet();">
                ${escapeHtml(action.label)}
            </button>
        `;
    }).join('');
}
```

#### 3. Execute Actions

```javascript
function executeAIHelpAction(functionName, param) {
    // Close AI Help sheet first
    closeAIHelpSheet();
    
    // Small delay to let sheet close
    setTimeout(() => {
        switch (functionName) {
            // Tab switching
            case 'switchTab':
                switchTab(param);
                break;
            
            // Subtab switching
            case 'switchSubtab':
                const [tab, subtab] = param.split(':');
                switchTab(tab);
                setTimeout(() => {
                    if (tab === 'games') switchGamesTab(subtab);
                    else if (tab === 'stats') switchStatsTab(subtab);
                    else if (tab === 'hub') switchHubTab(subtab);
                    else if (tab === 'share') switchShareTab(subtab);
                }, 100);
                break;
            
            // Sheets
            case 'showCreateBattle':
                switchTab('hub');
                setTimeout(() => showCreateBattle(), 100);
                break;
            
            case 'showAddFriend':
                switchTab('hub');
                setTimeout(() => {
                    switchHubTab('friends');
                    setTimeout(() => showAddFriendSheet(), 100);
                }, 100);
                break;
            
            case 'showAccountSheet':
                showAccountSheet();
                break;
            
            case 'showHelpSheet':
                showHelpSheet();
                break;
            
            case 'showWalletSheet':
                showWalletSheet();
                break;
            
            case 'showSettingsSheet':
                showSettingsSheet();
                break;
            
            case 'showManualEntry':
                showManualEntry();
                break;
            
            case 'showSuggestGame':
                showSuggestGameSheet();
                break;
            
            case 'showFeedbackSheet':
                showFeedbackSheet();
                break;
            
            // Game-specific
            case 'openGame':
                const gameInfo = getGameInfo(param);
                if (gameInfo) openGame(param);
                break;
            
            case 'showGameHint':
                switchTab('home');
                setTimeout(() => {
                    const gameCard = document.querySelector(`[data-game-id="${param}"]`);
                    if (gameCard) showHintSheet(param);
                }, 100);
                break;
            
            default:
                console.warn('Unknown AI Help action:', functionName);
        }
    }, 300);
}
```

#### 4. CSS for Action Buttons

```css
.ai-help-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
    transition: transform 0.15s, box-shadow 0.15s;
}

.ai-help-action-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.ai-help-action-btn:active {
    transform: scale(0.98);
}

.ai-help-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}
```

#### 5. Update formatAIHelpResponse

```javascript
function formatAIHelpResponse(text) {
    // Parse out actions first
    const { cleanText, actions } = parseAIHelpActions(text);
    
    // Format the clean text
    let formatted = escapeHtml(cleanText);
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^[•\-]\s+/gm, '• ');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Add action buttons
    if (actions.length > 0) {
        formatted += `<div class="ai-help-actions">${renderAIHelpActions(actions)}</div>`;
    }
    
    return formatted;
}
```

---

## Phase 2: Deep Links (Future)

### URL Structure

```
https://gameshelf.co/#/battles/create
https://gameshelf.co/#/games/discover
https://gameshelf.co/#/games/wordle
https://gameshelf.co/#/friends/add
https://gameshelf.co/#/settings
https://gameshelf.co/#/help
```

### Route Registry

```javascript
const ROUTES = {
    '/': () => switchTab('home'),
    '/games': () => switchTab('games'),
    '/games/shelf': () => { switchTab('games'); switchGamesTab('shelf'); },
    '/games/discover': () => { switchTab('games'); switchGamesTab('discover'); },
    '/games/:gameId': (params) => openGame(params.gameId),
    '/stats': () => switchTab('stats'),
    '/stats/overview': () => { switchTab('stats'); switchStatsTab('overview'); },
    '/stats/bygame': () => { switchTab('stats'); switchStatsTab('bygame'); },
    '/battles': () => switchTab('hub'),
    '/battles/create': () => { switchTab('hub'); showCreateBattle(); },
    '/friends': () => { switchTab('hub'); switchHubTab('friends'); },
    '/friends/add': () => { switchTab('hub'); switchHubTab('friends'); showAddFriendSheet(); },
    '/share': () => switchTab('share'),
    '/settings': () => showSettingsSheet(),
    '/help': () => showHelpSheet(),
    '/wallet': () => showWalletSheet(),
};

function handleRoute() {
    const hash = location.hash.slice(1) || '/';
    
    // Find matching route
    for (const [pattern, handler] of Object.entries(ROUTES)) {
        const params = matchRoute(pattern, hash);
        if (params !== null) {
            handler(params);
            return;
        }
    }
    
    // Default to home
    switchTab('home');
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
```

### Benefits of Deep Links

| Use Case | Example |
|----------|---------|
| Share specific screen | "Check out Game Shelf battles: gameshelf.co/#/battles" |
| Email links | "Click here to add games: gameshelf.co/#/games/discover" |
| Push notifications | Link directly to relevant screen |
| Help articles | Link to exact feature being described |
| QR codes | Physical marketing with direct links |

---

## Analytics

Track action usage to see what's most helpful:

```javascript
async function executeAIHelpAction(functionName, param) {
    // Track action click
    try {
        await firebase.database().ref('ai-help-action-analytics').push({
            odometerId: appData.odometerId,
            action: functionName,
            param: param || null,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (e) {
        console.warn('Failed to track action:', e);
    }
    
    // ... execute action
}
```

---

## Testing Checklist

### Phase 1 Testing

- [ ] Action tokens parse correctly
- [ ] Multiple tokens in one response handled
- [ ] Malformed tokens don't break rendering
- [ ] Buttons render with correct labels
- [ ] Each action navigates to correct screen
- [ ] Auth-required actions prompt sign-in
- [ ] Actions work from multi-turn conversations
- [ ] Sheet closes before navigation
- [ ] Timing works (no race conditions)

### AI Response Testing

- [ ] AI includes actions appropriately
- [ ] AI doesn't over-use actions
- [ ] AI uses correct action names
- [ ] AI handles "take me there" follow-ups

---

## Rollout Plan

### Step 1: Client-Only (No AI Changes)
1. Add parsing logic
2. Add button rendering
3. Add action executor
4. Test with hardcoded responses

### Step 2: Update AI Prompt
1. Add NAVIGATION ACTIONS section to system prompt
2. Deploy to Firebase Functions
3. Test AI generates valid tokens

### Step 3: Monitor & Iterate
1. Track action analytics
2. Review AI response quality
3. Add more actions as needed
4. Consider Phase 2 deep links

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 MVP | 2-3 hours | None |
| Phase 2 Deep Links | 4-6 hours | Phase 1 |
| Analytics | 30 min | Phase 1 |

---

## Open Questions

1. **Multiple actions?** Should AI ever include more than one action button?
   - Recommendation: Start with max 1, expand if needed

2. **Action button position?** Always at end, or inline?
   - Recommendation: Always at end, cleaner UX

3. **Confirmation for destructive actions?** e.g., "Reset Data"
   - Recommendation: Don't include destructive actions in AI responses

4. **What if function doesn't exist?** Graceful fallback?
   - Recommendation: Log warning, don't show button
