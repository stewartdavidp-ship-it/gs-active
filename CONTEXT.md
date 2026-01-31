# GS-Active Archive Context

## Archive Info
- **Version**: gs-active-2026-01-31-v23
- **Date**: January 31, 2026
- **Status**: Daily stats email via SendGrid + Command Center improvements

## Current URL Structure (LIVE)
```
gameshelf.co/           → Landing Page (v1.5.8)
gameshelf.co/app        → Game Shelf PWA (v1.4.4)
gameshelf.co/beta       → Beta Hub (v2.3.2)
gameshelf.co/terms      → Terms of Service
gameshelf.co/privacy    → Privacy Policy
gameshelf.co/quotle     → Quotle
gameshelf.co/slate      → Slate
gameshelf.co/rungs      → Rungs
gameshelf.co/wordboxing → Word Boxing
```

## Key Versions
| App | Version | Notes |
|-----|---------|-------|
| Game Shelf PWA | 1.4.4 | What's New popup removed - badge only |
| Landing Page | 1.5.8 | Added legal footer + terms/privacy pages |
| Beta Hub | 2.3.2 | TEST_MODE disabled for production |
| Command Center | 8.6.0 | User Stats dashboard + GitHub Actions monitoring fixes |
| Firebase Functions | 2.3.0 | Daily stats email via SendGrid |

## Known Issues / TODO
*(All previously logged Command Center issues have been fixed in v8.5.2)*

- Consider social proof section on landing page (testimonials, user stats)
- Consider interactive demo element on landing page

## Future Email Features (Backlog)
- Re-engagement nudges (inactive users)
- Weekly digest (personal stats)
- Achievement notifications
- Battle notifications
- Welcome email series

## Reminders
- **March 31, 2026**: SendGrid free trial expires - evaluate Amazon SES vs Resend vs paid SendGrid

## Command Center v8.6.0 Changes

### New Feature: User Statistics Dashboard
- New "Users" menu item under Monitor
- Shows: Total users, Active (30d/7d/today), Growth metrics, Retention %
- Uses Firebase Cloud Function (getUserStats) for secure data access

### Fix: GitHub Actions Deploy Card Stuck
- Deploy cards for firebase-functions would hang after "Workflow not found"
- Now properly marks deployment as success and auto-closes card
- Added proper GitHub Actions workflow monitoring for all deploy types

### Fix: Firebase Functions Library
- Added firebase-functions-compat.js to enable Cloud Function calls

## Firebase Functions v2.3.0 Changes

### New: Daily Stats Email
- Sends daily email at 8:00 AM Eastern via SendGrid
- Includes: Total users, Active users, Growth, Retention, Hints usage
- Requires env vars: SENDGRID_API_KEY, SENDGRID_TO_EMAIL

### New: Test Function
- testDailyStatsEmail for manual testing (requires auth)

## Session Notes
- Daily stats email working - first email sent successfully
- SendGrid domain authentication configured (gameshelf.co)
- Command Center web host has GitHub token issue (localStorage) - works fine locally
- Previous: getUserStats Cloud Function, What's New popup fix
