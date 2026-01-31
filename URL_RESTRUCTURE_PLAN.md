# Game Shelf URL Restructure Plan

**Goal:** Move PWA to `/app/`, Landing Page to `/` for beta launch  
**Date:** January 30, 2026  
**Status:** Planning

---

## Current vs Target Structure

### Current Structure (gameshelf.co)
```
/                   → Game Shelf PWA (index.html)
/beta/              → Beta Hub
/quotle/            → Quotle
/slate/             → Slate
/rungs/             → Rungs
/wordboxing/        → Word Boxing
```

**Landing page** is currently on a separate repo/domain (game-shelf-landing)

### Target Structure (gameshelf.co)
```
/                   → Landing Page (marketing/corporate)
/app/               → Game Shelf PWA (main app)
/beta/              → Beta Hub (no change)
/quotle/            → Quotle (no change)
/slate/             → Slate (no change)
/rungs/             → Rungs (no change)
/wordboxing/        → Word Boxing (no change)
```

---

## Impact Summary

| Component | Changes Required | Complexity |
|-----------|-----------------|------------|
| **GitHub Repo Structure** | Add `/app/` folder, move files | Medium |
| **Game Shelf PWA** | Update manifest, sw.js, internal links | Medium |
| **Landing Page** | Move to root, update CTAs | Low |
| **Beta Hub** | Update links to PWA | Low |
| **Command Center** | Update app definitions, subPath | Medium |
| **Individual Games** | No changes | None |
| **Firebase Functions** | No changes | None |

---

## Detailed Changes by Component

### 1. GitHub Repo Structure (stewartdavidp-ship-it/gameshelf)

**Current repo structure:**
```
gameshelf/
├── index.html          ← PWA
├── sw.js               ← PWA service worker
├── manifest.json       ← PWA manifest
├── manifest-test.json  ← Test PWA manifest
├── icons/              ← PWA icons
├── icons-test/         ← Test PWA icons
├── RELEASE_NOTES.txt
├── beta/               ← Beta Hub
│   ├── index.html
│   └── landing/
├── quotle/
├── slate/
├── rungs/
└── wordboxing/
```

**Target repo structure:**
```
gameshelf/
├── index.html          ← Landing Page (NEW - moved from landing/)
├── app/                ← NEW FOLDER
│   ├── index.html      ← PWA (moved from root)
│   ├── sw.js           ← PWA service worker (moved)
│   ├── manifest.json   ← PWA manifest (updated paths)
│   ├── manifest-test.json
│   ├── icons/          ← PWA icons (moved)
│   └── icons-test/
├── beta/               ← Beta Hub (unchanged location)
│   └── index.html      ← Updated links
├── quotle/             ← unchanged
├── slate/              ← unchanged
├── rungs/              ← unchanged
├── wordboxing/         ← unchanged
└── RELEASE_NOTES.txt   ← For landing page? Or keep in /app/
```

### 2. Game Shelf PWA (gameshelf/app/index.html)

**Version bump:** 1.3.54 → 1.4.0 (minor - structural change)

**Changes required:**

#### 2a. Internal link updates
```javascript
// Beta badge link - NO CHANGE NEEDED (already absolute)
<a href="https://gameshelf.co/beta/">BETA</a>

// Game Shelf Originals URLs - NO CHANGE NEEDED (already absolute)
quotle: { url: 'https://gameshelf.co/quotle/' }  // Keep as-is
```

#### 2b. Service worker (sw.js) updates
```javascript
// Update CACHE_VERSION
const CACHE_VERSION = 'v1.4.0';

// Update scope if hardcoded (check if any paths need updating)
// Service worker scope is relative to sw.js location, so should work
```

#### 2c. Manifest.json updates
```json
{
  "start_url": "/app/index.html",
  "scope": "/app/",
  "shortcuts": [
    { "url": "/app/index.html?action=log" },
    { "url": "/app/index.html?tab=share" },
    { "url": "/app/index.html?game=wordle" }
  ],
  "share_target": {
    "action": "/app/index.html?share-target=true"
  }
}
```

#### 2d. FAQ/Help content updates
Search for references to `gameshelf.co` in install instructions:
```javascript
// Current
"Open **gameshelf.co** in Safari"

// Update to
"Open **gameshelf.co/app** in Safari"
```

#### 2e. Share text updates
```javascript
// Current
`Track your games: gameshelf.co`

// Consider updating to
`Track your games: gameshelf.co/app`
// OR keep as gameshelf.co since landing page will have CTA to /app
```

**Decision needed:** Should share links point to `/app` directly or to landing page `/`?
- **Option A:** Keep `gameshelf.co` → Landing page converts visitors
- **Option B:** Use `gameshelf.co/app` → Direct to app
- **Recommendation:** Option A - Landing page acts as conversion funnel

### 3. Landing Page (gameshelf/index.html - root)

**Version:** Keep as 1.1.0 or bump to 1.2.0

**Current location:** Separate repo (`game-shelf-landing`)  
**New location:** Root of main gameshelf repo

**Changes required:**

#### 3a. CTA button updates
```html
<!-- Current (points to test) -->
<a href="https://stewartdavidp-ship-it.github.io/gameshelf/" class="cta-button">

<!-- Update to -->
<a href="/app/" class="cta-button">
```

#### 3b. Game links updates
```html
<!-- Current -->
<a href="https://stewartdavidp-ship-it.github.io/Quotle/">

<!-- Update to -->
<a href="/quotle/">
```

#### 3c. Share link updates
```html
<!-- Current -->
sms:?body=...https://stewartdavidp-ship-it.github.io/gameshelf/

<!-- Update to -->
sms:?body=...https://gameshelf.co/app/
```

#### 3d. Meta tags
```html
<meta property="og:url" content="https://gameshelf.co/">
```

#### 3e. New "Join the Beta" messaging
- Update hero section to mention beta
- Add prominent "Join the Beta" CTA
- Link to `/beta/` for beta registration

### 4. Beta Hub (gameshelf/beta/index.html)

**Version bump:** 2.3.0 → 2.3.1

**Changes required:**

#### 4a. Links to main Game Shelf app
```html
<!-- Current (multiple locations) -->
<a href="https://gameshelf.co/">

<!-- Update to -->
<a href="https://gameshelf.co/app/">
```

**Affected locations (from grep):**
- Line 2435: Registration complete CTA
- Line 2535: What's Next CTA
- Line 2580: Dashboard action button

#### 4b. OG image path
```html
<!-- Current -->
<meta property="og:image" content="https://gameshelf.co/landing/og-image.png">

<!-- Keep as-is OR update to -->
<meta property="og:image" content="https://gameshelf.co/og-image.png">
```
**Decision:** Where will og-image.png live? Root or /app/?

### 5. Command Center (command-center/index.html)

**Version bump:** 8.3.8 → 8.4.0

**Changes required:**

#### 5a. Game Shelf app definition update
```javascript
// Current
gameshelf: {
    id: 'gameshelf', name: 'Game Shelf', icon: 'gs-logo',
    appType: 'public',
    targetPath: 'index.html', swPath: 'sw.js', hasServiceWorker: true,
    subPath: '',  // ← ROOT
    ...
}

// Update to
gameshelf: {
    id: 'gameshelf', name: 'Game Shelf', icon: 'gs-logo',
    appType: 'public',
    targetPath: 'index.html', swPath: 'sw.js', hasServiceWorker: true,
    subPath: 'app',  // ← NEW SUBFOLDER
    ...
}
```

#### 5b. Landing page definition update
```javascript
// Current (separate repos)
landing: {
    id: 'landing', name: 'Landing Page', icon: '📣',
    appType: 'public',
    targetPath: 'index.html', swPath: '', hasServiceWorker: false,
    subPath: '',
    repos: { test: '', prod: '' },
    repoPatterns: {
        test: ['game-shelf-landing-test'],
        prod: ['game-shelf-landing']
    },
    ...
}

// Option A: Remove landing as separate app (merged into gameshelf repo)
// Landing becomes just root index.html of gameshelf repo

// Option B: Keep as separate app, update subPath
landing: {
    subPath: '',  // Root of gameshelf repo
    // But this conflicts with gameshelf app...
}
```

**Recommendation:** 
- Remove `landing` as a separate app definition
- Landing page is just the root `index.html` of the gameshelf repo
- Deploy landing page updates via gameshelf deploy to root

**OR** create a new app type for "root landing":
```javascript
gameshelf_landing: {
    id: 'gameshelf_landing', name: 'GS Landing', icon: '📣',
    appType: 'public',
    targetPath: 'index.html', swPath: '', hasServiceWorker: false,
    subPath: '',  // Root
    // Uses same repo as gameshelf
    ...
}
```

#### 5c. Consolidated repos update
```javascript
// Current
const CONSOLIDATED_REPOS = {
    'gameshelf': ['quotle', 'slate', 'rungs', 'wordboxing', 'beta'],
    ...
};

// Update to
const CONSOLIDATED_REPOS = {
    'gameshelf': ['app', 'quotle', 'slate', 'rungs', 'wordboxing', 'beta'],
    ...
};
```

#### 5d. Validation rules update
```javascript
// Current
gameshelf: {
    required: ['index.html', 'sw.js', 'manifest.json', 'manifest-test.json'],
    optional: ['RELEASE_NOTES.txt', 'CNAME'],
    folders: ['icons', 'icons-test', 'quotle', 'slate', 'rungs', 'wordboxing', 'beta']
}

// Update for new structure - need to handle /app/ subfolder
```

### 6. gs-active Archive Structure

**Update folder structure:**
```
gs-active/
├── gameshelf/           ← Contains PWA files (deploys to /app/)
│   ├── index.html       ← PWA
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── landing/             ← Landing page (deploys to root /)
│   ├── index.html
│   └── og-image.png
├── beta/                ← Beta Hub (deploys to /beta/)
├── quotle/              ← unchanged
├── slate/               ← unchanged
├── rungs/               ← unchanged
├── wordboxing/          ← unchanged
└── command-center/
```

---

## Migration Steps (Execution Order)

### Phase 1: Prepare Files (gs-active)

1. **Create landing/ folder with updated landing page**
   - Copy from current landing/
   - Update all CTAs to point to `/app/`
   - Update game links to relative paths
   - Add "Join the Beta" messaging

2. **Update gameshelf/ folder (PWA)**
   - Update manifest.json paths to `/app/`
   - Update FAQ install instructions
   - Bump version to 1.4.0
   - Update sw.js CACHE_VERSION

3. **Update beta/ folder**
   - Change all `gameshelf.co/` links to `gameshelf.co/app/`
   - Bump version to 2.3.1

4. **Update command-center/**
   - Update gameshelf subPath to 'app'
   - Update or remove landing app definition
   - Bump version to 8.4.0

### Phase 2: Deploy to Test Environment

1. Deploy Command Center to test
2. Test deploy workflow for new structure
3. Verify:
   - Landing page at root
   - PWA at /app/
   - Beta hub links work
   - Individual games still work

### Phase 3: Deploy to Production

1. **IMPORTANT:** Deploy all at once to avoid broken state
2. Deploy order:
   a. Landing page to root (via gameshelf repo)
   b. PWA to /app/ (via gameshelf repo)
   c. Beta Hub update (via gameshelf repo)
3. Test all links work

### Phase 4: Post-Migration

1. Update any external links (social media, etc.)
2. Monitor for broken links
3. Consider redirect from `/index.html` to `/app/` for existing PWA users (OPTIONAL - see below)

---

## PWA User Migration Concern

**Issue:** Users who have the PWA installed from `gameshelf.co/` will still have:
- Service worker scoped to `/`
- Shortcuts pointing to `/index.html`

**Options:**

### Option A: No redirect (recommended for beta)
- Old PWA installations will break on next open
- Users will land on landing page
- Landing page CTAs lead to `/app/` for reinstall
- Since only ~20-30 beta users, manual communication works

### Option B: Smart redirect in landing page
```html
<!-- In landing page index.html -->
<script>
// If user has service worker registered for root, redirect to /app/
if ('serviceWorker' in navigator && window.matchMedia('(display-mode: standalone)').matches) {
    window.location.href = '/app/';
}
</script>
```

### Option C: Server-side redirect (requires GitHub Pages workaround)
- GitHub Pages doesn't support server-side redirects
- Would need CloudFlare or similar

**Recommendation:** Option A with user communication for beta. Only 20-30 users.

---

## Open Questions

1. **Share links:** Keep `gameshelf.co` or change to `gameshelf.co/app`?
   - Recommendation: Keep `gameshelf.co` (landing page funnels to app)

2. **og-image.png location:** Root or `/app/`?
   - Recommendation: Root (`/og-image.png`) for landing page SEO

3. **Landing page RELEASE_NOTES:** Separate or combined?
   - Recommendation: Combined in main RELEASE_NOTES.txt

4. **Command Center landing page handling:**
   - Option A: Remove as separate app (deploy manually or via gameshelf)
   - Option B: New app definition pointing to same repo, different subPath
   - Recommendation: Option B for flexibility

---

## Files to Create/Modify

| File | Action | Version |
|------|--------|---------|
| `gameshelf/index.html` | REPLACE with landing page | 1.2.0 |
| `gameshelf/app/index.html` | MOVE from root, update | 1.4.0 |
| `gameshelf/app/sw.js` | MOVE from root, update version | 1.4.0 |
| `gameshelf/app/manifest.json` | MOVE from root, update paths | - |
| `gameshelf/app/manifest-test.json` | MOVE from root, update paths | - |
| `gameshelf/app/icons/` | MOVE from root | - |
| `gameshelf/app/icons-test/` | MOVE from root | - |
| `gameshelf/beta/index.html` | Update links | 2.3.1 |
| `command-center/index.html` | Update app defs | 8.4.0 |

---

## Testing Checklist

- [ ] Landing page loads at gameshelf.co/
- [ ] Landing page CTAs go to /app/
- [ ] PWA installs correctly from /app/
- [ ] PWA shortcuts work (Log, Share, Wordle)
- [ ] Share target works
- [ ] Beta Hub links go to /app/
- [ ] Individual games still accessible
- [ ] Command Center deploys work for new structure
- [ ] Service worker updates correctly

---

## Rollback Plan

If issues occur:
1. Revert GitHub commits on gameshelf repo
2. Landing page and PWA return to original structure
3. Command Center can remain updated (subPath change is backwards compatible if files exist in both locations)

---

*Document created: January 30, 2026*
