# Help System Implementation Spec

**Version:** 1.0  
**For App Version:** 1.3.3  
**Date:** January 29, 2026

---

## Overview

Replace the current "Help & About" menu item with a comprehensive Help system including:
- Searchable FAQ with category accordions
- Basic markdown rendering in answers
- "Ask AI" fallback (always visible)
- Embedded Feedback, About, and What's New
- Badge for new FAQ entries
- Analytics tracking for FAQ views

---

## 1. FAQ Data Structure

Embed in index.html as a script tag:

```html
<script id="faq-data" type="application/json">
{
  "version": "1.0",
  "appVersion": "1.3.3",
  "lastUpdated": "2026-01-29",
  "categories": [
    {
      "id": "getting-started",
      "name": "Getting Started",
      "icon": "🚀",
      "order": 1,
      "questions": [
        {
          "id": "what-is-gs",
          "q": "What is Game Shelf?",
          "a": "Game Shelf is a **free app** that tracks...",
          "keywords": ["about", "purpose", "what"]
        }
      ]
    }
  ]
}
</script>
```

---

## 2. CSS Styles

Add to style section:

```css
/* Help Sheet */
.help-sheet {
    display: flex;
    flex-direction: column;
    height: 85vh;
    max-height: 85vh;
}

.help-search-container {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.help-search-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 14px;
    outline: none;
}

.help-search-input:focus {
    border-color: var(--primary);
}

.help-search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    pointer-events: none;
}

.help-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

/* Category Accordion */
.help-category {
    border-bottom: 1px solid var(--border);
}

.help-category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    cursor: pointer;
    transition: background 0.15s;
}

.help-category-header:hover {
    background: var(--surface-hover);
}

.help-category-header:active {
    background: var(--surface-active);
}

.help-category-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.help-category-icon {
    font-size: 18px;
}

.help-category-arrow {
    color: var(--text-secondary);
    transition: transform 0.2s;
}

.help-category.expanded .help-category-arrow {
    transform: rotate(90deg);
}

.help-category-questions {
    display: none;
    padding: 0 16px 8px 44px;
}

.help-category.expanded .help-category-questions {
    display: block;
}

/* FAQ Item */
.help-faq-item {
    border-radius: 8px;
    margin-bottom: 4px;
    overflow: hidden;
}

.help-faq-question {
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text);
    background: var(--surface);
    border-radius: 8px;
    transition: background 0.15s;
}

.help-faq-question:hover {
    background: var(--surface-hover);
}

.help-faq-item.expanded .help-faq-question {
    border-radius: 8px 8px 0 0;
    background: var(--primary);
    color: white;
}

.help-faq-answer {
    display: none;
    padding: 12px;
    background: var(--surface);
    border-radius: 0 0 8px 8px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
}

.help-faq-item.expanded .help-faq-answer {
    display: block;
}

.help-faq-answer strong {
    color: var(--text);
    font-weight: 600;
}

.help-faq-answer code {
    background: var(--surface-hover);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
}

.help-faq-answer a {
    color: var(--primary);
    text-decoration: none;
}

.help-faq-answer p {
    margin: 0 0 12px 0;
}

.help-faq-answer p:last-child {
    margin-bottom: 0;
}

/* Search Results */
.help-search-results {
    padding: 8px 16px;
}

.help-search-results-header {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.help-no-results {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-secondary);
}

.help-no-results-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

/* Ask AI Section */
.help-ask-ai {
    margin: 16px;
    padding: 16px;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    border-radius: 12px;
    text-align: center;
}

.help-ask-ai-title {
    color: white;
    font-size: 14px;
    margin-bottom: 8px;
}

.help-ask-ai-btn {
    background: white;
    color: var(--primary);
    border: none;
    padding: 10px 24px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}

.help-ask-ai-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Bottom Actions */
.help-bottom-actions {
    border-top: 1px solid var(--border);
    padding: 8px 0;
    flex-shrink: 0;
}

.help-action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.15s;
}

.help-action-item:hover {
    background: var(--surface-hover);
}

.help-action-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
}

.help-action-text {
    flex: 1;
}

.help-action-badge {
    background: var(--primary);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
}

/* Menu badge for Help */
.help-menu-badge {
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
    margin-left: 8px;
}
```

---

## 3. HTML Structure

Add help sheet HTML (in sheets section):

```html
<!-- Help Sheet -->
<div id="help-sheet" class="sheet" style="display:none;">
    <div class="sheet-content help-sheet">
        <div class="sheet-header">
            <h3>Help</h3>
            <button class="sheet-close" onclick="closeSheet('help-sheet')">✕</button>
        </div>
        
        <!-- Search -->
        <div class="help-search-container" style="position:relative;">
            <span class="help-search-icon">🔍</span>
            <input type="text" 
                   id="help-search-input" 
                   class="help-search-input" 
                   placeholder="Search FAQs..."
                   oninput="handleHelpSearch(this.value)">
        </div>
        
        <!-- Content Area -->
        <div class="help-content" id="help-content">
            <!-- Populated by JS -->
        </div>
        
        <!-- Ask AI (Always Visible) -->
        <div class="help-ask-ai">
            <div class="help-ask-ai-title">🤖 Can't find your answer?</div>
            <button class="help-ask-ai-btn" onclick="showAskAI()">Ask AI</button>
        </div>
        
        <!-- Bottom Actions -->
        <div class="help-bottom-actions">
            <div class="help-action-item" onclick="showFeedbackForm()">
                <span class="help-action-icon">💬</span>
                <span class="help-action-text">Send Feedback</span>
            </div>
            <div class="help-action-item" onclick="showAbout()">
                <span class="help-action-icon">ℹ️</span>
                <span class="help-action-text">About Game Shelf</span>
            </div>
            <div class="help-action-item" onclick="showWhatsNew()">
                <span class="help-action-icon">🎉</span>
                <span class="help-action-text">What's New</span>
                <span class="help-action-badge" id="help-whats-new-badge" style="display:none;">NEW</span>
            </div>
        </div>
    </div>
</div>
```

---

## 4. JavaScript Implementation

### 4.1 Core Variables & Data Loading

```javascript
// ============ HELP SYSTEM ============
let faqData = null;
let faqSearchTimeout = null;
let expandedCategories = new Set();
let expandedFaqs = new Set();
const FAQ_SEARCH_DEBOUNCE = 300;

function getFaqData() {
    if (!faqData) {
        try {
            const el = document.getElementById('faq-data');
            faqData = JSON.parse(el.textContent);
        } catch (e) {
            console.error('Failed to load FAQ data:', e);
            faqData = { categories: [] };
        }
    }
    return faqData;
}
```

### 4.2 Markdown Renderer

```javascript
function renderMarkdown(text) {
    if (!text) return '';
    return text
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_ (but not inside words)
        .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>')
        .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>')
        // Code: `text`
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Links: [text](url)
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        // Paragraphs: double newline
        .replace(/\n\n/g, '</p><p>')
        // Line breaks: single newline
        .replace(/\n/g, '<br>')
        // Wrap in paragraph
        .replace(/^(.+)$/, '<p>$1</p>');
}
```

### 4.3 Render Categories (Default View)

```javascript
function renderHelpCategories() {
    const data = getFaqData();
    const container = document.getElementById('help-content');
    
    const sortedCategories = [...data.categories].sort((a, b) => a.order - b.order);
    
    container.innerHTML = sortedCategories.map(cat => `
        <div class="help-category ${expandedCategories.has(cat.id) ? 'expanded' : ''}" 
             data-category="${cat.id}">
            <div class="help-category-header" onclick="toggleHelpCategory('${cat.id}')">
                <div class="help-category-title">
                    <span class="help-category-icon">${cat.icon}</span>
                    <span>${escapeHtml(cat.name)}</span>
                </div>
                <span class="help-category-arrow">▶</span>
            </div>
            <div class="help-category-questions">
                ${cat.questions.map(faq => renderFaqItem(faq, cat.id)).join('')}
            </div>
        </div>
    `).join('');
}

function renderFaqItem(faq, categoryId) {
    const isExpanded = expandedFaqs.has(faq.id);
    return `
        <div class="help-faq-item ${isExpanded ? 'expanded' : ''}" data-faq="${faq.id}">
            <div class="help-faq-question" onclick="toggleFaq('${faq.id}', '${categoryId}')">
                <span>${escapeHtml(faq.q)}</span>
                <span>${isExpanded ? '−' : '+'}</span>
            </div>
            <div class="help-faq-answer">
                ${renderMarkdown(faq.a)}
            </div>
        </div>
    `;
}
```

### 4.4 Toggle Functions

```javascript
function toggleHelpCategory(categoryId) {
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
    }
    
    const el = document.querySelector(`.help-category[data-category="${categoryId}"]`);
    if (el) {
        el.classList.toggle('expanded', expandedCategories.has(categoryId));
    }
}

function toggleFaq(faqId, categoryId) {
    const wasExpanded = expandedFaqs.has(faqId);
    
    if (wasExpanded) {
        expandedFaqs.delete(faqId);
    } else {
        expandedFaqs.add(faqId);
        // Track view
        trackFaqView(faqId, categoryId);
    }
    
    const el = document.querySelector(`.help-faq-item[data-faq="${faqId}"]`);
    if (el) {
        el.classList.toggle('expanded', !wasExpanded);
    }
}
```

### 4.5 Search Implementation

```javascript
function handleHelpSearch(query) {
    clearTimeout(faqSearchTimeout);
    
    faqSearchTimeout = setTimeout(() => {
        const trimmed = query.trim();
        
        if (trimmed.length === 0) {
            renderHelpCategories();
            return;
        }
        
        if (trimmed.length < 2) {
            return; // Wait for more chars
        }
        
        const results = searchFaq(trimmed);
        renderSearchResults(results, trimmed);
        
        // Track search
        trackFaqSearch(trimmed, results.length);
    }, FAQ_SEARCH_DEBOUNCE);
}

function searchFaq(query) {
    const data = getFaqData();
    const q = query.toLowerCase();
    const results = [];
    
    data.categories.forEach(cat => {
        cat.questions.forEach(faq => {
            const score = getFaqMatchScore(faq, q);
            if (score > 0) {
                results.push({
                    ...faq,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    categoryIcon: cat.icon,
                    score
                });
            }
        });
    });
    
    return results.sort((a, b) => b.score - a.score);
}

function getFaqMatchScore(faq, query) {
    let score = 0;
    const qLower = faq.q.toLowerCase();
    const aLower = faq.a.toLowerCase();
    
    // Exact phrase in question = highest
    if (qLower.includes(query)) score += 10;
    
    // Exact phrase in answer = medium
    if (aLower.includes(query)) score += 5;
    
    // Keyword match
    if (faq.keywords?.some(k => k.includes(query) || query.includes(k))) {
        score += 4;
    }
    
    // Word-by-word matching
    const words = query.split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
        if (qLower.includes(word)) score += 2;
        if (aLower.includes(word)) score += 1;
        if (faq.keywords?.some(k => k.includes(word))) score += 1;
    });
    
    return score;
}

function renderSearchResults(results, query) {
    const container = document.getElementById('help-content');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="help-no-results">
                <div class="help-no-results-icon">🔍</div>
                <div>No results for "${escapeHtml(query)}"</div>
                <div style="margin-top:8px;font-size:13px;">Try different keywords or ask AI below</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="help-search-results">
            <div class="help-search-results-header">${results.length} result${results.length !== 1 ? 's' : ''}</div>
            ${results.map(faq => `
                <div class="help-faq-item ${expandedFaqs.has(faq.id) ? 'expanded' : ''}" data-faq="${faq.id}">
                    <div class="help-faq-question" onclick="toggleFaq('${faq.id}', '${faq.categoryId}')">
                        <span>${faq.categoryIcon} ${escapeHtml(faq.q)}</span>
                        <span>${expandedFaqs.has(faq.id) ? '−' : '+'}</span>
                    </div>
                    <div class="help-faq-answer">
                        ${renderMarkdown(faq.a)}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
```

### 4.6 Show Help Sheet

```javascript
function showHelp() {
    // Reset state
    expandedFaqs.clear();
    document.getElementById('help-search-input').value = '';
    
    // Render categories
    renderHelpCategories();
    
    // Update What's New badge
    updateHelpWhatsNewBadge();
    
    // Mark FAQ as seen (for badge)
    markFaqSeen();
    
    // Show sheet
    showSheet('help-sheet');
}
```

### 4.7 Analytics Tracking

```javascript
function trackFaqView(faqId, categoryId) {
    if (!currentUser?.uid) return;
    
    try {
        const ref = db.ref(`faq-analytics/${currentUser.uid}/views`).push();
        ref.set({
            faqId,
            categoryId,
            timestamp: Date.now(),
            appVersion: APP_VERSION
        });
    } catch (e) {
        console.error('Failed to track FAQ view:', e);
    }
}

function trackFaqSearch(query, resultCount) {
    if (!currentUser?.uid) return;
    
    try {
        const ref = db.ref(`faq-analytics/${currentUser.uid}/searches`).push();
        ref.set({
            query: query.substring(0, 100), // Limit length
            resultCount,
            timestamp: Date.now(),
            appVersion: APP_VERSION
        });
    } catch (e) {
        console.error('Failed to track FAQ search:', e);
    }
}

function trackAskAIClicked(searchQuery) {
    if (!currentUser?.uid) return;
    
    try {
        const ref = db.ref(`faq-analytics/${currentUser.uid}/askAI`).push();
        ref.set({
            searchQuery: searchQuery?.substring(0, 100) || null,
            timestamp: Date.now(),
            appVersion: APP_VERSION
        });
    } catch (e) {
        console.error('Failed to track Ask AI:', e);
    }
}
```

### 4.8 Badge System

```javascript
function checkFaqBadge() {
    const data = getFaqData();
    const lastSeenVersion = localStorage.getItem('faq_seen_version');
    
    // Show badge if FAQ version is newer than last seen
    if (!lastSeenVersion || lastSeenVersion !== data.version) {
        return true;
    }
    return false;
}

function markFaqSeen() {
    const data = getFaqData();
    localStorage.setItem('faq_seen_version', data.version);
    updateHelpMenuBadge();
}

function updateHelpMenuBadge() {
    const badge = document.getElementById('help-menu-badge');
    if (badge) {
        badge.style.display = checkFaqBadge() ? 'inline-block' : 'none';
    }
}

function updateHelpWhatsNewBadge() {
    const badge = document.getElementById('help-whats-new-badge');
    if (badge) {
        // Use existing What's New badge logic
        const hasUnseenUpdate = checkForUnseenWhatsNew();
        badge.style.display = hasUnseenUpdate ? 'inline-block' : 'none';
    }
}
```

### 4.9 Ask AI Integration

```javascript
function showAskAI() {
    // Get current search query if any
    const searchInput = document.getElementById('help-search-input');
    const currentQuery = searchInput?.value?.trim() || '';
    
    // Track click
    trackAskAIClicked(currentQuery);
    
    // Close help sheet
    closeSheet('help-sheet');
    
    // Open hint sheet in "help mode"
    // This reuses existing hint infrastructure
    openHelpAI(currentQuery);
}

function openHelpAI(initialQuery) {
    // TODO: Phase 3 - Implement AI help mode
    // For now, show toast indicating feature coming
    // showToast('AI Help coming soon!', 'info');
    
    // Or open existing hint sheet with help context
    showHintSheet('help', initialQuery);
}
```

---

## 5. Menu Changes

Update menu rendering to replace Feedback with Help:

```javascript
// In renderMenu() or equivalent:

// OLD:
// <div class="menu-item" onclick="showFeedback()">
//     <span class="menu-icon">💬</span>
//     <span>Feedback</span>
// </div>

// NEW:
`<div class="menu-item" onclick="showHelp()">
    <span class="menu-icon">❓</span>
    <span>Help</span>
    <span class="help-menu-badge" id="help-menu-badge" style="display:${checkFaqBadge() ? 'inline-block' : 'none'}"></span>
</div>`
```

Remove the separate "Help & About" item since Help now contains About.

---

## 6. Firebase Rules Update

Add rules for FAQ analytics:

```json
{
  "faq-analytics": {
    "$uid": {
      ".read": "$uid === auth.uid",
      ".write": "$uid === auth.uid",
      "views": {
        ".indexOn": ["timestamp", "faqId"]
      },
      "searches": {
        ".indexOn": ["timestamp"]
      },
      "askAI": {
        ".indexOn": ["timestamp"]
      }
    }
  }
}
```

---

## 7. Deployment Checklist

When deploying FAQ update:

- [ ] Update `faq-data.json` content
- [ ] Increment FAQ `version` field if adding new questions
- [ ] Embed JSON in index.html `<script id="faq-data">`
- [ ] Update APP_VERSION in index.html
- [ ] Update sw.js CACHE_VERSION
- [ ] Update RELEASE_NOTES.txt
- [ ] Test search with common queries
- [ ] Verify badge shows for new FAQ version
- [ ] Create deployment package

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `gameshelf/index.html` | Add FAQ JSON, CSS, HTML, JS |
| `gameshelf/sw.js` | Update CACHE_VERSION |
| `firebase-functions/database.rules.json` | Add faq-analytics rules |
| `CONTEXT.md` | Document new feature |
| `RELEASE_NOTES.txt` | Add release notes |

---

## 9. Testing Checklist

- [ ] Help sheet opens from menu
- [ ] Categories expand/collapse
- [ ] FAQs expand/collapse with answer
- [ ] Markdown renders correctly (bold, italic, links, code)
- [ ] Search filters results as you type
- [ ] Search with no results shows message
- [ ] "Ask AI" button visible and clickable
- [ ] Feedback link works
- [ ] About link works
- [ ] What's New link works with badge
- [ ] Help menu badge shows for new FAQ version
- [ ] Badge clears after opening Help
- [ ] Analytics tracked (check Firebase console)
- [ ] Works on mobile (touch, scrolling)
- [ ] Works in dark mode

---

## 10. Phase 3: AI Help Integration

### 10.1 Overview

Replace the placeholder "Ask AI" toast with a dedicated AI help mode that:
- Uses existing hint Cloud Function infrastructure
- Has a help-specific system prompt (not game hints)
- Answers questions about Game Shelf features, troubleshooting, and usage
- Rate limited separately from game hints (or shared limits)

### 10.2 User Flow

1. User taps "Ask AI" in Help sheet
2. Help sheet closes, AI Help sheet opens
3. User types question in text input
4. AI responds with help content
5. User can ask follow-up questions
6. Conversation persists until closed

### 10.3 UI Components

**AI Help Sheet** (new bottom sheet):
```html
<div class="bottom-sheet-overlay" id="ai-help-sheet-overlay">
    <div class="bottom-sheet ai-help-sheet">
        <div class="bottom-sheet-handle"></div>
        <div class="ai-help-header">
            <span>🤖 AI Help</span>
            <button onclick="closeAIHelp()">×</button>
        </div>
        
        <!-- Conversation Area -->
        <div class="ai-help-messages" id="ai-help-messages">
            <!-- Welcome message -->
            <div class="ai-help-message assistant">
                Hi! I'm here to help with Game Shelf. What would you like to know?
            </div>
        </div>
        
        <!-- Input Area -->
        <div class="ai-help-input-area">
            <input type="text" id="ai-help-input" placeholder="Ask about Game Shelf...">
            <button onclick="sendAIHelpMessage()">Send</button>
        </div>
        
        <!-- Token cost notice -->
        <div class="ai-help-footer">
            <span>💎 5 tokens per question</span>
        </div>
    </div>
</div>
```

### 10.4 System Prompt

```javascript
const AI_HELP_SYSTEM_PROMPT = `You are the Game Shelf Help Assistant. Your role is to help users with:
- How to use Game Shelf features
- Troubleshooting issues
- Understanding streaks, stats, battles, hints, and the economy
- Account and sync questions

Guidelines:
- Be concise and friendly
- Use bullet points for steps
- Reference specific UI elements (e.g., "tap the Games tab")
- If you don't know something, say so
- Don't make up features that don't exist
- Don't provide game hints or puzzle answers - redirect to the Hints feature

You have access to this knowledge base:
${HELP_REFERENCE_CONTENT}

Current app version: ${APP_VERSION}
User is ${currentUser ? 'signed in' : 'not signed in'}
`;
```

### 10.5 Cloud Function Changes

Option A: **Reuse existing hint function** with mode parameter
```javascript
// In getHint Cloud Function
if (data.mode === 'help') {
    systemPrompt = AI_HELP_SYSTEM_PROMPT;
    // Different rate limit bucket?
}
```

Option B: **New dedicated function** `getAIHelp`
```javascript
exports.getAIHelp = functions.https.onCall(async (data, context) => {
    // Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { question, conversationHistory } = data;
    
    // Rate limiting (shared or separate from hints)
    // Token deduction (5 tokens per question)
    // Call Claude API with help system prompt
    // Return response
});
```

### 10.6 Client-Side Implementation

```javascript
let aiHelpConversation = [];

function showAskAI() {
    const searchInput = document.getElementById('help-search-input');
    const currentQuery = searchInput?.value?.trim() || '';
    
    trackAskAIClicked(currentQuery);
    closeHelpSheet();
    
    // Reset conversation
    aiHelpConversation = [];
    renderAIHelpMessages();
    
    // Pre-fill input if user had a search query
    if (currentQuery) {
        document.getElementById('ai-help-input').value = currentQuery;
    }
    
    document.getElementById('ai-help-sheet-overlay').classList.add('active');
}

async function sendAIHelpMessage() {
    const input = document.getElementById('ai-help-input');
    const question = input.value.trim();
    if (!question) return;
    
    // Check tokens
    if (getUserTokens() < 5) {
        showToast('Not enough tokens (need 5)', 'error');
        return;
    }
    
    // Add user message to conversation
    aiHelpConversation.push({ role: 'user', content: question });
    renderAIHelpMessages();
    input.value = '';
    
    // Show loading
    showAIHelpLoading();
    
    try {
        const response = await firebase.functions().httpsCallable('getAIHelp')({
            question,
            conversationHistory: aiHelpConversation.slice(-6) // Last 3 exchanges
        });
        
        // Add assistant response
        aiHelpConversation.push({ role: 'assistant', content: response.data.answer });
        renderAIHelpMessages();
        
        // Deduct tokens locally (server already deducted)
        updateLocalTokens(-5);
        
    } catch (error) {
        showToast('Failed to get help: ' + error.message, 'error');
        // Remove the user message on failure
        aiHelpConversation.pop();
        renderAIHelpMessages();
    }
    
    hideAIHelpLoading();
}

function renderAIHelpMessages() {
    const container = document.getElementById('ai-help-messages');
    
    let html = `
        <div class="ai-help-message assistant">
            Hi! I'm here to help with Game Shelf. What would you like to know?
        </div>
    `;
    
    aiHelpConversation.forEach(msg => {
        html += `
            <div class="ai-help-message ${msg.role}">
                ${msg.role === 'assistant' ? renderFaqMarkdown(msg.content) : escapeHtml(msg.content)}
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}
```

### 10.7 Rate Limiting Options

| Option | Pros | Cons |
|--------|------|------|
| Shared with hints | Simple, one bucket | Heavy hint users can't get help |
| Separate bucket | Independent limits | More complexity |
| No limit (just tokens) | Simplest | Potential abuse |

**Recommendation:** Separate bucket with generous limits (50/day for help vs 20/hour for hints)

### 10.8 Cost Considerations

- Each AI help request = 1 Claude API call
- Estimated ~500-1000 tokens per request (with system prompt)
- At scale: monitor usage patterns
- Consider caching common questions (FAQ-like responses)

### 10.9 Analytics

Track in `faq-analytics/{uid}/aiHelp/`:
```javascript
{
    questionId: string,
    question: string (truncated to 200 chars),
    responseLength: number,
    conversationLength: number,
    timestamp: number,
    appVersion: string
}
```

### 10.10 Future Enhancements

1. **Suggested questions** - Show common questions as quick-tap chips
2. **Feedback on responses** - Thumbs up/down on AI answers
3. **Escalation to human** - "Still need help? Contact support"
4. **Context injection** - Pass user's current screen/state to AI
5. **Proactive help** - AI notices user struggling and offers assistance

### 10.11 Implementation Checklist

- [ ] Design AI Help sheet UI
- [ ] Add CSS styles
- [ ] Add HTML structure
- [ ] Create/modify Cloud Function
- [ ] Implement client-side JS
- [ ] Add rate limiting
- [ ] Add analytics tracking
- [ ] Test token deduction
- [ ] Test conversation flow
- [ ] Test error handling
- [ ] Update HELP_REFERENCE.md with AI context
- [ ] Deploy and monitor costs
