# Game Shelf AI Hint Helper - Firebase Functions

This Firebase Cloud Function provides a secure proxy for AI-powered hints in Game Shelf.

## Features

- 🔐 **Secure**: API key stored server-side, never exposed to clients
- 🚦 **Rate Limited**: 20 hints/hour, 50 hints/day per user
- 📊 **Usage Tracking**: Analytics for monitoring usage
- 🔒 **Auth Required**: Only signed-in users can use hints

## Prerequisites

⚠️ **Blaze Plan Required**: Firebase Cloud Functions require the Blaze (pay-as-you-go) plan.

1. Go to: https://console.firebase.google.com/project/word-boxing/usage/details
2. Click "Upgrade" → Select "Blaze"
3. Add a payment method

**Cost**: Blaze has a generous free tier (2M invocations/month). You'll mainly pay for Anthropic API (~$0.01/hint).

## Setup Instructions

### 1. Install Firebase CLI (if not already)

```bash
sudo npm install -g firebase-tools
firebase login
```

### 2. Navigate to the functions folder

```bash
cd firebase-functions
```

### 3. Link to your project

```bash
firebase use word-boxing
```

### 4. Create .env file with your API key

```bash
cd functions
cp .env.example .env
# Edit .env and add your Anthropic API key
```

Get an API key from: https://console.anthropic.com

Your `.env` file should look like:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

### 5. Install dependencies

```bash
npm install
cd ..
```

### 6. Deploy

```bash
firebase deploy --only functions
```

### 7. Verify deployment

Check Firebase Console → Functions to see your deployed functions:
- `getHint` - Main hint generation
- `getHintUsage` - Check user's remaining hints

## Database Rules

Add these rules to allow the hint usage tracking:

```json
{
  "rules": {
    "hint-usage": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "hint-analytics": {
      ".read": false,
      ".write": "auth != null"
    }
  }
}
```

## Cost Estimation

- **Firebase Functions**: Free tier includes 2M invocations/month
- **Anthropic API**: ~$0.003-0.015 per hint (depending on complexity)
- **With rate limits**: Max ~$75/month per 100 active users

## Monitoring

View logs:
```bash
firebase functions:log
```

View usage in Firebase Console:
- Functions → Dashboard for invocation counts
- Database → hint-analytics for per-game stats
- Database → hint-usage for per-user usage

## Troubleshooting

**"AI hints are not configured"**
- API key not set. Run: `firebase functions:config:set anthropic.api_key="..."`
- Then redeploy: `firebase deploy --only functions`

**"Hourly/Daily limit reached"**
- Rate limiting is working as expected
- Users can wait or upgrade limits in code

**"unauthenticated"**
- User not signed in to Game Shelf
- Hints require authentication

## Files

```
firebase-functions/
├── firebase.json          # Firebase project config
├── functions/
│   ├── package.json       # Node.js dependencies
│   └── index.js           # Cloud Function code
└── README.md              # This file
```
