# Game Shelf Migration Tool

One-time utility for consolidating separate test repos into a unified folder structure under `gameshelftest`.

## Purpose

**Before (current):**
```
stewartdavidp-ship-it.github.io/quotletest/
stewartdavidp-ship-it.github.io/slatetest/
stewartdavidp-ship-it.github.io/Rungstest/
stewartdavidp-ship-it.github.io/wordboxingtest/
stewartdavidp-ship-it.github.io/gameshelftest/
```

**After (consolidated):**
```
stewartdavidp-ship-it.github.io/gameshelftest/           → Game Shelf hub
stewartdavidp-ship-it.github.io/gameshelftest/quotle/    → Quotle
stewartdavidp-ship-it.github.io/gameshelftest/slate/     → Slate
stewartdavidp-ship-it.github.io/gameshelftest/rungs/     → Rungs
stewartdavidp-ship-it.github.io/gameshelftest/wordboxing/ → Word Boxing
```

## What It Does

1. **Scans** all source test repos to inventory files
2. **Transforms** key files for new path structure:
   - `manifest.json` - Updates `start_url`, `scope`, `id` 
   - `sw.js` - Updates cache name prefix, adds scope comment
   - `index.html` - Fixes absolute paths if needed
3. **Commits** all files to consolidated repo in batch

## Transformations

### manifest.json
```json
// Before
{ "start_url": "/", "scope": "/" }

// After (for quotle subfolder)
{ "start_url": "/gameshelftest/quotle/", "scope": "/gameshelftest/quotle/" }
```

### sw.js
```javascript
// Before
const CACHE_NAME = 'quotle-v1.2.3';

// After
// Consolidated PWA - Scope: /gameshelftest/quotle/
// App: quotle
const CACHE_NAME = 'quotle-quotle-v1.2.3';
```

## Usage

1. Open `index.html` in browser
2. Enter GitHub Personal Access Token (needs `repo` scope)
3. Click **Connect**
4. Click **Start Scan** to fetch all source repos
5. Select which apps to migrate (Quotle, Slate, Rungs, Word Boxing)
6. Review transformations
7. Click **Migrate** to commit to consolidated repo

## Configuration

Edit `SOURCE_REPOS` in the script to modify:
- Source repo names
- Target subfolder paths
- Files to include

```javascript
const SOURCE_REPOS = {
    quotle: {
        sourceRepo: 'stewartdavidp-ship-it/quotletest',
        targetPath: 'quotle',  // Will become /gameshelftest/quotle/
        files: ['index.html', 'sw.js', 'manifest.json'],
        iconFolders: ['icons']
    },
    // ...
};
```

## After Migration

1. Wait 1-2 minutes for GitHub Pages rebuild
2. Test each new URL
3. Verify PWA install works
4. Check service worker scope in DevTools → Application → Service Workers
5. Update Command Center to support new structure

## Notes

- This is a **one-time migration tool** - can be deleted after consolidation
- Does NOT modify or delete source repos
- Creates a single batch commit for all files
- Game Shelf hub (root) is optional - deselect if you want to migrate games first

## Troubleshooting

**"File not found" errors during scan:**
- Some repos may not have all expected files (e.g., no sw.js)
- Tool will skip missing files and continue

**PWA not installing after migration:**
- Check manifest.json has correct `start_url` and `scope`
- Clear browser cache / unregister old service worker
- Verify HTTPS is working

**Service worker scope conflicts:**
- Each app's sw.js must only control its subfolder
- Cache names are prefixed with app ID to avoid collisions
