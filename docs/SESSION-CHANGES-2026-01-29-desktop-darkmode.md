# Session Changes - January 29, 2026

**Session Focus:** Desktop enhancement and dark mode visibility fixes  
**Versions:** 1.3.22 → 1.3.23 → 1.3.24 → 1.3.25 → 1.3.26

---

## Summary of All Changes

| Version | Feature |
|---------|---------|
| 1.3.23 | Desktop containment (480px centered, themed background, dismissible banner) |
| 1.3.24 | Active nav tab purple background pill |
| 1.3.25 | Tutorial highlight class (brightness filter) |
| 1.3.26 | Tutorial fixes (targets, positioning, visibility), tab opacity bump to 25% |

---

## Game Shelf v1.3.26 - Tutorial System Overhaul

### Tutorial Target Fixes
Old FABs were hidden, now targeting header buttons:
- `#share-fab` → `#header-share-btn`
- `#hint-fab` → `#header-hint-btn`
- `.share-hub-header` → `.share-results-section` (class didn't exist)
- `#browse-categories` → Added action to switch to Discover subtab first

### Desktop Positioning Fix
```javascript
// In positionTutorialElements()
let offsetX = 0;
let offsetY = 0;
if (window.innerWidth >= 600) {
    const bodyRect = document.body.getBoundingClientRect();
    offsetX = bodyRect.left;
    offsetY = bodyRect.top;
}
// Then subtract offset from all positioning coords
```

### Tutorial Highlight Class
```css
.tutorial-highlighted {
    position: relative;
    z-index: 2001 !important;
    filter: brightness(1.4) !important;
    box-shadow: 0 0 20px 5px rgba(102, 126, 234, 0.4) !important;
    background: rgba(102, 126, 234, 0.25) !important;
    border-radius: 12px !important;
}
```

### Active Tab Visibility
```css
.nav-tab.active {
    color: var(--accent-purple);
    background: rgba(102, 126, 234, 0.25);  /* bumped from 0.15 */
}
```

---

## Game Shelf v1.3.25 - Tutorial Spotlight Brightening

### Overview
Added .tutorial-highlighted class to brighten actual target elements (intermediate version).

---

## Game Shelf v1.3.23 - Desktop Enhancement

### Overview
Added desktop browser support with contained layout and mobile reminder. All changes are behind a media query, leaving mobile experience completely unchanged.

### CSS Changes (index.html)

**Added after `body { }` styles (~line 130):**
```css
/* Desktop containment - only activates on screens wider than 600px */
@media (min-width: 600px) {
    html {
        background: var(--desktop-bg, #0d0d14);
    }
    
    body {
        left: 50%;
        right: auto;
        width: 100%;
        max-width: 480px;
        transform: translateX(-50%);
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.4);
        border-left: 1px solid var(--border);
        border-right: 1px solid var(--border);
    }
}

/* Desktop banner - hidden on mobile via media query */
.desktop-banner {
    display: none;
}

@media (min-width: 600px) {
    .desktop-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12));
        border-bottom: 1px solid var(--border);
        font-size: 0.8rem;
        color: var(--text-secondary);
        flex-shrink: 0;
    }
    
    .desktop-banner.dismissed {
        display: none;
    }
    
    .desktop-banner-text {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .desktop-banner-dismiss {
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px 12px;
        font-size: 0.75rem;
        transition: background 0.2s;
    }
    
    .desktop-banner-dismiss:hover {
        background: var(--bg-hover);
    }
}
```

### HTML Changes (index.html)

**Added before `<header class="header">` (~line 8872):**
```html
<!-- Desktop Banner - only visible on screens wider than 600px -->
<div class="desktop-banner" id="desktop-banner">
    <span class="desktop-banner-text">
        📱 Game Shelf is built for mobile — for the best experience, use your phone!
    </span>
    <button class="desktop-banner-dismiss" onclick="dismissDesktopBanner()">Got it</button>
</div>
```

### JavaScript Changes (index.html)

**Added after `setTheme()` function (~line 16835):**
```javascript
// Desktop enhancement functions
function isDesktopScreen() {
    return window.innerWidth >= 600 && !/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
}

function initDesktopBanner() {
    if (!isDesktopScreen()) return;
    
    const dismissed = localStorage.getItem('gs_desktop_banner_dismissed');
    const banner = document.getElementById('desktop-banner');
    if (banner && dismissed) {
        banner.classList.add('dismissed');
    }
    
    // Set initial desktop background based on current theme
    updateDesktopBackground();
}

function dismissDesktopBanner() {
    const banner = document.getElementById('desktop-banner');
    if (banner) {
        banner.classList.add('dismissed');
        localStorage.setItem('gs_desktop_banner_dismissed', 'true');
    }
}

function updateDesktopBackground() {
    // Only relevant on desktop
    if (window.innerWidth < 600) return;
    
    const isLight = document.body.classList.contains('light-mode');
    document.documentElement.style.setProperty('--desktop-bg', 
        isLight ? '#c8c8d0' : '#0d0d14'
    );
}
```

**Modified `setTheme()` to call `updateDesktopBackground()`:**
```javascript
function setTheme(theme) {
    // ... existing code ...
    saveData();
    // Update desktop background to match theme
    updateDesktopBackground();
}
```

**Added to `init()` function after theme loading:**
```javascript
// Initialize desktop banner (only shows on wide screens)
initDesktopBanner();
```

---

## Game Shelf v1.3.24 - Dark Mode Visibility Fix

### Overview
Fixed visibility issues in dark mode where tutorial highlights and active tab indicators were nearly invisible.

### CSS Changes (index.html)

**Modified `.tutorial-spotlight` (~line 7767):**
```css
.tutorial-spotlight {
    position: absolute;
    border-radius: 12px;
    background: transparent;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85);
    transition: all 0.4s ease;
    pointer-events: none;
    /* Strong visible border for dark mode */
    border: 3px solid var(--accent-purple);
    /* Inner glow to illuminate dark content */
    box-shadow: 
        0 0 0 9999px rgba(0, 0, 0, 0.85),
        inset 0 0 20px 5px rgba(102, 126, 234, 0.25),
        0 0 30px 8px rgba(102, 126, 234, 0.5);
}

.tutorial-spotlight.pulse {
    animation: tutorialPulse 2s ease-in-out infinite;
}

@keyframes tutorialPulse {
    0%, 100% { 
        box-shadow: 
            0 0 0 9999px rgba(0, 0, 0, 0.85),
            inset 0 0 20px 5px rgba(102, 126, 234, 0.25),
            0 0 30px 8px rgba(102, 126, 234, 0.5); 
        border-color: var(--accent-purple);
    }
    50% { 
        box-shadow: 
            0 0 0 9999px rgba(0, 0, 0, 0.85),
            inset 0 0 30px 10px rgba(102, 126, 234, 0.35),
            0 0 50px 15px rgba(102, 126, 234, 0.7); 
        border-color: #8b9cf4;
    }
}
```

**Modified `.nav-tab` and `.nav-tab.active` (~line 3092):**
```css
.nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
    border-radius: 12px;
    margin: 4px 2px;
}

.nav-tab.active {
    color: var(--accent-purple);
    background: rgba(102, 126, 234, 0.15);
}
```

---

## RELEASE_NOTES Entries

### v1.3.26
```javascript
'1.3.26': [
    { icon: '🎓', title: 'Tutorial Fixes', desc: 'Fixed tutorial targeting hidden FABs, desktop positioning, and missing elements' }
],
```

### v1.3.24
```javascript
'1.3.24': [
    { icon: '🌙', title: 'Dark Mode Visibility', desc: 'Active tab indicator now much more visible in dark mode' }
],
```

### v1.3.23
```javascript
'1.3.23': [
    { icon: '🖥️', title: 'Desktop Enhancement', desc: 'Better experience on desktop browsers with contained layout and mobile reminder' }
],
```

Note: v1.3.25 was intermediate and not shown to users.

---

## Files Modified

| File | Changes |
|------|---------|
| `gameshelf/index.html` | Desktop CSS, banner HTML, desktop JS functions, dark mode CSS fixes |
| `gameshelf/sw.js` | CACHE_VERSION updated to v1.3.24 |
| `gameshelf/RELEASE_NOTES.txt` | Added v1.3.23 and v1.3.24 entries |

---

## Technical Notes

### Desktop Containment Trick
The CSS `transform: translateX(-50%)` on body causes all `position: fixed` children to position relative to body instead of viewport. This contains the nav bar, sheets, and overlays within the 480px container without modifying each element individually.

### Tutorial Positioning on Desktop
When body has `transform`, `getBoundingClientRect()` still returns viewport coordinates, but fixed elements position relative to body. Solution: calculate body's offset and subtract from all positioning calculations.

### Dark Mode Design Principle
Dark mode requires **additive light effects** (glows, bright backgrounds) rather than **subtractive shading** (shadows, dimming). 

For tutorial highlighting, we apply a class directly to the target element with:
- `filter: brightness(1.4)` - makes the element brighter
- `background: rgba(102, 126, 234, 0.25)` - visible purple tint
- `box-shadow` - glow effect around the element

### localStorage Keys Added
- `gs_desktop_banner_dismissed` - Tracks if user dismissed the desktop banner
