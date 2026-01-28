# Game Shelf Beta Hub

**Version:** 1.1.0  
**Deploy to:** `gameshelf.co/beta/`

## What It Does

A comprehensive beta tester engagement hub:

### For New Users (Signup View)
- Explains the program (benefits, expectations)
- User signs in with Google (Firebase Auth)
- Credits 20 coins to their wallet
- Sets expectations for beta software

### For Returning Users (Dashboard)
1. **Your Stats** - Games played, surveys completed, streak, coins
2. **Quick Actions** - Launch Game Shelf, Start a Battle
3. **GS Original Games** - Links to Quotle, Slate, Rungs, Word Boxing with play status
4. **Daily Survey** - 5 rotating questions per day (3-5 questions)
5. **Game-Specific Surveys** - Triggered when user plays a GS game
6. **Open Feedback** - Free-form text input
7. **Leaderboard** - Top 10 beta testers by engagement
8. **Active Contests** - Battle Royale Week, Feedback Champion

## Survey System

### Daily Questions (13 total, 5 shown per day)
- **Experience**: Overall rating, ease of use, value
- **Features**: AI hints, battles, import method, missing features
- **Issues**: Bugs encountered, confusing parts, performance
- **Usage**: Frequency, NPS, favorite games

### Game-Specific Questions (3 per game)
Triggered when user plays one of the GS originals:
- Quotle, Slate, Rungs, Word Boxing, Game Shelf app
- Questions about fun factor, specific mechanics, improvements

## Firebase Structure

```
users/{odometerId}/
  earlyAccess/
    joinedAt: timestamp
    source: 'beta-hub'
    initialCoinsGranted: 20
    surveyResponses/
      {questionId}: { answer, date, timestamp }
    surveyStreak: number
  shelf/wallet/coins: +20

beta/
  feedback/
    {timestamp}: { userId, displayName, feedback, date }
```

## Leaderboard Scoring

```
Score = gamesPlayed + (surveysCompleted * 2) + (streak * 5)
```

## Deployment

Single index.html file (not a PWA) - upload to `/beta/` folder on gameshelf.co.

## Sharing

Share `https://gameshelf.co/beta/` via LinkedIn, email, text, etc.
