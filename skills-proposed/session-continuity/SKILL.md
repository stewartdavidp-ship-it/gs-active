# Session Continuity Skill

## Purpose
Ensures Claude maintains context after session compaction by reviewing transcript files.

## When to Use
**CRITICAL:** Use this skill immediately when:
1. You see `[NOTE: This conversation was successfully compacted...]` at the start of context
2. A transcript file path is mentioned (e.g., `/mnt/transcripts/...`)
3. The user references prior work that isn't fully detailed in the compaction summary

## Required Actions After Compaction

### Step 1: Check for Transcript
```bash
ls -la /mnt/transcripts/
```

### Step 2: Review Transcript Incrementally
The transcript may be large. Review it in chunks:
```bash
# Start with the end (most recent context)
tail -500 /mnt/transcripts/<filename>.txt

# Then review earlier sections as needed
head -500 /mnt/transcripts/<filename>.txt
```

### Step 3: Extract Key Context
Look for:
- File paths being worked on
- Version numbers
- Specific bugs or features being addressed
- User preferences mentioned
- Decisions already made

### Step 4: Confirm Understanding
Before continuing work, briefly confirm with the user:
- "I've reviewed the transcript. We were working on [X] at version [Y]. Should I continue with [Z]?"

## Why This Matters
- Compaction summaries lose details (exact line numbers, specific code, nuanced decisions)
- Users shouldn't have to repeat themselves
- Continuity builds trust and efficiency

## Notes
- Transcripts are stored in `/mnt/transcripts/`
- A journal.txt file may catalog multiple transcripts
- Always check transcript BEFORE making changes to avoid duplicating or undoing prior work
