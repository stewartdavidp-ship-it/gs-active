---
name: gs-active
description: Game Shelf development archive structure and conventions. Use when working with gs-active zip files, creating new versions, or needing to understand the Game Shelf PWA and game ecosystem structure. Covers folder layout, versioning, deployment packages, and file relationships.
---

# Game Shelf Development - MANDATORY WORKFLOWS

## 🛑 STOP - READ THIS FIRST

Before doing ANY work on Game Shelf apps, you MUST:

1. **Read CONTEXT.md** to see current versions
2. **Follow the checklist** for your task type (below)
3. **Create deployment packages** (not just HTML files) for PWA apps
4. **Update sw.js** when you update any PWA app

---

## ❌ THINGS THAT BREAK THE APP - NEVER DO THESE

| NEVER DO THIS | WHY IT BREAKS THINGS |
|---------------|----------------------|
| Output just index.html for PWA apps | PWA won't update - needs sw.js, manifest, icons |
| Forget to update sw.js CACHE_VERSION | Users get stale cached version forever |
| Leave version mismatches | Confusing bugs, cache issues |
| Skip incrementing version | Can't track changes, deployment issues |
| Forget RELEASE_NOTES.txt | Next session doesn't know what changed |

---

## ✅ MANDATORY CHECKLIST - MODIFYING ANY PWA APP

**PWA Apps: Game Shelf, Quotle, Slate, Rungs, Word Boxing**

```
BEFORE making changes:
□ Read CONTEXT.md - note current version (e.g., 1.4.1)

WHILE making changes:
□ Make your code changes

AFTER making changes - DO ALL OF THESE:
□ Increment version (1.4.1 → 1.4.2)
□ Update ALL version locations in index.html (usually 4-5 places)
□ Update sw.js CACHE_VERSION to match (e.g., 'v1.4.2')
□ Add entry to RELEASE_NOTES.txt
□ Create FULL deployment package (not just HTML)
□ Update gs-active archive
```

### Finding Version Locations

**Game Shelf has 5+ version locations:**
```
grep -n "1\.4\.1" gameshelf/index.html
```
Update ALL matches, including:
- `<meta name="version" content="X.X.X">`
- `const APP_VERSION = 'X.X.X'` or similar
- Footer displays
- Settings/About displays
- Any version badges

**Plus sw.js:**
```javascript
const CACHE_VERSION = 'vX.X.X';  // MUST match app version
```

---

## 📦 DEPLOYMENT PACKAGE STRUCTURE

### Game Shelf (Has Test Assets) → Deploys to /app

```
gameshelf-deploy-vX_X_X.zip
└── gameshelf-deploy-vX_X_X/
    ├── index.html          ← REQUIRED
    ├── sw.js               ← REQUIRED (CACHE_VERSION must match)
    ├── manifest.json       ← REQUIRED
    ├── manifest-test.json  ← REQUIRED
    ├── RELEASE_NOTES.txt   ← REQUIRED
    ├── icons/              ← REQUIRED
    └── icons-test/         ← REQUIRED
```

### Other PWA Apps (Quotle, Slate, Rungs, Word Boxing)

```
{app}-deploy-vX_X_X.zip
└── {app}-deploy-vX_X_X/
    ├── index.html          ← REQUIRED
    ├── sw.js               ← REQUIRED (CACHE_VERSION must match)
    ├── manifest.json       ← REQUIRED
    └── icons/              ← REQUIRED
```

### Landing Page → Deploys to Root /

```
landing-deploy-vX_X_X.zip
└── landing-deploy-vX_X_X/
    ├── index.html          ← Landing page
    ├── images/             ← Screenshots
    ├── terms/
    │   └── index.html      ← Terms of Service
    └── privacy/
        └── index.html      ← Privacy Policy
```

**IMPORTANT:** Landing page deploys to ROOT `/` - no nested folder in target.

### Non-PWA Apps (Command Center, Test Plan, Beta Hub)

```
Single index.html file is OK - no sw.js or icons needed
```

### Firebase Functions

```
Just upload index.js to Command Center - no zip needed
GitHub Actions handles deployment automatically
```

---

## 🔧 TASK-SPECIFIC WORKFLOWS

### Task: Fix a Bug

```
1. Find current version in CONTEXT.md
2. Make the fix
3. Increment PATCH version (1.4.1 → 1.4.2)
4. Update ALL version locations + sw.js
5. Update RELEASE_NOTES.txt
6. Create deployment package
7. Update gs-active archive
```

### Task: Add a Feature

```
1. Find current version in CONTEXT.md
2. Add the feature
3. Increment MINOR version (1.4.2 → 1.5.0)
4. Update ALL version locations + sw.js
5. Update RELEASE_NOTES.txt
6. Create deployment package
7. Update gs-active archive
```

### Task: Update Firebase Functions

```
1. Edit gs-active/firebase-functions/functions/index.js
2. (No version number needed for functions)
3. Update gs-active archive
4. Tell user to upload index.js to Command Center
5. GitHub Actions will auto-deploy
```

### Task: Update Legal Pages (Terms/Privacy)

```
1. Edit gs-active/landing/terms/index.html or privacy/index.html
2. Update version in landing/index.html
3. Create landing deployment package
4. Deploy to root /
```

### Task: Code Review Only (No Deployment)

```
1. Review the code
2. Explain findings
3. ASK USER: "Do you want me to implement these changes?"
4. If yes → follow Fix a Bug or Add a Feature workflow
5. If no → done
```

---

## 📁 ARCHIVE STRUCTURE

```
gs-active/
├── gameshelf/           ← PWA (needs full package) - deploys to /app
│   ├── index.html
│   ├── sw.js            ← CACHE_VERSION must match
│   ├── manifest.json
│   ├── manifest-test.json
│   ├── RELEASE_NOTES.txt
│   ├── icons/
│   └── icons-test/
├── quotle/              ← PWA (needs full package)
│   ├── index.html
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── slate/               ← PWA (needs full package)
├── rungs/               ← PWA (needs full package)
├── wordboxing/          ← PWA (needs full package)
├── landing/             ← NOT a PWA - deploys to ROOT
│   ├── index.html       ← Main landing page
│   ├── images/          ← Screenshots
│   ├── terms/
│   │   └── index.html   ← Terms of Service
│   └── privacy/
│       └── index.html   ← Privacy Policy
├── command-center/      ← NOT a PWA (just index.html)
├── testplan/            ← NOT a PWA (just index.html)
├── beta/                ← NOT a PWA (just index.html)
├── firebase-functions/  ← Backend (just index.js matters)
├── docs/                ← Documentation & planning
│   ├── TERMS_OF_SERVICE.md   ← Source for terms page
│   ├── PRIVACY_POLICY.md     ← Source for privacy page
│   └── *.md             ← Other docs
├── CONTEXT.md           ← READ FIRST - has current versions
├── STANDARDS.md         ← Coding conventions
└── *.md                 ← Planning docs
```

---

## 🌐 DEPLOYMENT TARGETS

### Production (gameshelf.co)

| App | URL | Deploy To |
|-----|-----|-----------|
| Landing Page | https://gameshelf.co/ | root `/` |
| Terms of Service | https://gameshelf.co/terms | root `/terms` |
| Privacy Policy | https://gameshelf.co/privacy | root `/privacy` |
| Game Shelf PWA | https://gameshelf.co/app | `/app` |
| Beta Hub | https://gameshelf.co/beta | `/beta` |
| Quotle | https://gameshelf.co/quotle | `/quotle` |
| Slate | https://gameshelf.co/slate | `/slate` |
| Rungs | https://gameshelf.co/rungs | `/rungs` |
| Word Boxing | https://gameshelf.co/wordboxing | `/wordboxing` |

### Test (GitHub Pages)

| App | URL |
|-----|-----|
| Game Shelf | https://stewartdavidp-ship-it.github.io/gameshelftest/ |
| Others | https://stewartdavidp-ship-it.github.io/gameshelftest/{app}/ |

---

## 📜 LEGAL PAGES

All apps link to centralized legal pages on the landing site:
- **Terms of Service:** https://gameshelf.co/terms
- **Privacy Policy:** https://gameshelf.co/privacy

These are referenced from:
- Game Shelf setup welcome screen (implicit consent)
- Game Shelf settings menu (Legal section)
- Game Shelf hint sheet (AI disclaimer)
- Landing page footer

When updating legal content:
1. Edit source markdown in `docs/TERMS_OF_SERVICE.md` or `docs/PRIVACY_POLICY.md`
2. Update the HTML in `landing/terms/index.html` or `landing/privacy/index.html`
3. Deploy landing page to root

---

## 📋 END OF SESSION CHECKLIST

```
□ List all files modified
□ List current versions of all modified apps
□ Create deployment packages for modified PWA apps
□ Create updated gs-active archive with all changes
□ Note any pending tasks for next session
```

---

## ⚠️ COMMON MISTAKES

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Just outputting HTML | PWA breaks for users | Always create full package |
| Forgetting sw.js | Users stuck on old version | Always update CACHE_VERSION |
| Version mismatch | Cache bugs | grep for version, update ALL |
| Not reading CONTEXT.md | Work with wrong version | Always read first |
| Skipping RELEASE_NOTES | Lost change history | Always update |
| Wrong landing package structure | Files in wrong place | No nested folder for root deploy |

---

## 🔢 VERSION FORMAT

`MAJOR.MINOR.PATCH`

- **PATCH** (1.4.1 → 1.4.2): Bug fixes
- **MINOR** (1.4.2 → 1.5.0): New features  
- **MAJOR** (1.5.0 → 2.0.0): Breaking changes

**Current versions** - always check CONTEXT.md, but approximately:
- Game Shelf PWA: 1.4.x
- Landing Page: 1.5.x
- Command Center: 8.4.x
- Quotle: 1.2.x
- Slate, Rungs, Word Boxing: 1.0.x
