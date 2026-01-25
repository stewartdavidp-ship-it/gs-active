# Game Shelf Development Standards

> **IMPORTANT:** Reference this file at the start of every Claude session.
> Say: "I'm working on Game Shelf. Please read STANDARDS.md first."

---

## Version Numbering

### Format: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking changes, major rewrites
- **MINOR:** New features, significant additions
- **PATCH:** Bug fixes, small tweaks

### Rules
1. Always increment from current deployed version
2. Never skip numbers (1.0.0 → 1.0.1, not 1.0.0 → 1.0.5)
3. Reset to 1.0.0 only for complete rewrites (like we just did)

### Version Locations (ALL must match)
```html
<meta name="version" content="1.0.0">           <!-- Line 6, required -->
const VERSION = '1.0.0';                        <!-- JS constant -->
<footer>v1.0.0 • AppName</footer>               <!-- Footer display -->
<p>Version: v1.0.0</p>                          <!-- About section -->
```

---

## File Naming

### Game Files
```
appname-vX.X.X.html

✅ gameshelf-v1.0.0.html
✅ quotle-v1.0.1.html
✅ slate-v1.0.0.html
❌ GameShelf-V1.html
❌ gameshelf_v1.0.0.html
❌ gameshelf.html
```

### Always lowercase, hyphens, include full version

---

## HTML Structure

### Required Head Elements (in order)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="version" content="X.X.X">
    <title>App Name</title>
    <!-- Rest of head -->
</head>
```

### Console Logging
```javascript
console.log('🎮 App Name vX.X.X initialized');
```

---

## Code Style

### JavaScript
```javascript
// Use const/let, never var
const VERSION = '1.0.0';
let currentGame = null;

// Use arrow functions for callbacks
array.map(item => item.value);

// Use template literals
console.log(`Version: ${VERSION}`);

// Use async/await, not .then()
const data = await fetchData();

// Descriptive function names
function handleGameComplete() {}  // ✅
function hgc() {}                 // ❌
```

### CSS
```css
/* Use CSS variables for colors */
:root {
    --primary: #667eea;
    --background: #1a1a2e;
}

/* Mobile-first media queries */
.element { /* mobile styles */ }
@media (min-width: 768px) { /* tablet+ */ }
```

---

## Deployment Checklist

### Before Deploying
- [ ] Version incremented from current deployed version
- [ ] All 4 version locations match
- [ ] Tested locally (open HTML file in browser)
- [ ] No console errors
- [ ] File named correctly (appname-vX.X.X.html)

### After Deploying
- [ ] Verify version shows correctly on live site
- [ ] Test core functionality
- [ ] Check mobile view

---

## Command Center Usage

### Workflow
1. Upload file → Check for version warnings
2. If warnings → Click "Fix to vX.X.X" 
3. Select app and environment (TEST first!)
4. Deploy → Wait for "LIVE" confirmation
5. Test on live site
6. If good → Promote to PROD

### Never
- Deploy directly to PROD without testing in TEST
- Deploy with version mismatches (fix them first)
- Deploy without incrementing version

---

## Session Handoff

### At End of Session, Provide:
1. **What was done** - List of changes made
2. **Current versions** - All app versions after changes
3. **What's next** - Pending tasks or known issues
4. **Files changed** - List of modified files

### Example Handoff:
```
## Session Summary - Jan 21, 2026

### Changes Made
- Fixed Quotle parser for new format
- Added dark mode toggle to Slate
- Updated Command Center to v6.2.3

### Current Versions
| App | Version | Status |
|-----|---------|--------|
| Game Shelf | 1.0.0 | Deployed |
| Quotle | 1.0.1 | Deployed |
| Slate | 1.0.0 | Deployed |

### Next Steps
- [ ] Test dark mode on mobile
- [ ] Add Rungs to onboarding

### Files to Save
- quotle-v1.0.1.html
- slate-v1.0.0.html
- command-center-v6.2.3.html
```

---

## Starting a New Session

### Provide Claude With:
1. **gs-active.zip** (or individual files)
2. **This STANDARDS.md file**
3. **What you want to work on**

### Example Prompt:
```
I'm working on Game Shelf. Here are my project files.
Please read STANDARDS.md and CONTEXT.md first.
Today I want to: [describe task]
```

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| Forgetting meta version tag | Always add `<meta name="version">` on line 6 |
| Version mismatch | Use Command Center's "Fix" button |
| Deploying to PROD first | Always TEST → verify → PROD |
| Not incrementing version | Check current deployed version first |
| Inconsistent naming | Always `lowercase-vX.X.X.html` |
| Using var | Use const/let |
| Native alert/confirm | Use dark mode DialogModal |

---

## Project-Specific Patterns

### Firebase Paths
```
/users/{uid}/...           - User data
/battles/{battleId}/...    - Battle data
/friends/{uid}/...         - Friend connections
```

### LocalStorage Keys (Game Shelf Originals)
```
quotle_stats, quotle_history
slate_stats, slate_history
rungs_stats, rungs_history
wordboxing_stats, wordboxing_history
```

### Share Text Parser Pattern
```javascript
// All parsers follow this structure
const patterns = {
    gameName: {
        pattern: /regex/,
        extract: (match) => ({ solved, score, ... })
    }
};
```
