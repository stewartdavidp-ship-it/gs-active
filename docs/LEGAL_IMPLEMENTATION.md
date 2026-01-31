# Legal Documents Implementation Guide

**Version:** 1.0  
**Date:** January 30, 2026

---

## Overview

This guide covers implementing Terms of Service and Privacy Policy acknowledgment in Game Shelf.

---

## 1. Document Hosting

### Option A: In-App (Recommended)
Add new sheets/modals to display Terms and Privacy Policy directly in the app.

### Option B: External Pages
Host at:
- `gameshelf.co/terms`
- `gameshelf.co/privacy`

### Option C: Both
Display summaries in-app with links to full documents online.

---

## 2. Acknowledgment Trigger

Show acknowledgment banner **once** when user first signs in with Google.

### Implementation

```javascript
// After successful Google sign-in
async function handleSignInSuccess(user) {
    // Check if user has acknowledged terms
    const userRef = db.ref(`users/${user.uid}/termsAccepted`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.val()) {
        // Show terms acknowledgment
        showTermsAcknowledgment(user.uid);
    } else {
        // Proceed normally
        completeSignIn();
    }
}
```

---

## 3. Acknowledgment UI

### Design: Banner Style (Minimal Friction)

```html
<div id="terms-acknowledgment-sheet" class="sheet">
    <div class="sheet-content" style="text-align: center; padding: 24px;">
        <div style="font-size: 2rem; margin-bottom: 16px;">📋</div>
        <h2 style="margin-bottom: 12px;">Welcome to Game Shelf!</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem;">
            By continuing, you agree to our 
            <a href="#" onclick="showTermsOfService(); return false;" style="color: var(--accent);">Terms of Service</a> 
            and 
            <a href="#" onclick="showPrivacyPolicy(); return false;" style="color: var(--accent);">Privacy Policy</a>.
        </p>
        
        <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 0.9rem;">
            <div style="margin-bottom: 8px;">✓ Your game data syncs across devices</div>
            <div style="margin-bottom: 8px;">✓ Connect with friends and compete</div>
            <div style="margin-bottom: 8px;">✓ We never sell your data</div>
            <div>✓ Delete your account anytime</div>
        </div>
        
        <button class="btn-primary" style="width: 100%;" onclick="acceptTerms()">
            Continue
        </button>
        
        <button class="btn-secondary" style="width: 100%; margin-top: 12px;" onclick="declineTerms()">
            Cancel Sign In
        </button>
    </div>
</div>
```

### JavaScript

```javascript
function showTermsAcknowledgment(userId) {
    pendingUserId = userId;
    showSheet('terms-acknowledgment-sheet');
}

async function acceptTerms() {
    if (!pendingUserId) return;
    
    // Record acceptance
    await db.ref(`users/${pendingUserId}/termsAccepted`).set({
        version: '2026-01-30',
        acceptedAt: Date.now()
    });
    
    closeSheet('terms-acknowledgment-sheet');
    completeSignIn();
    
    showToast('Welcome to Game Shelf! 🎮');
}

function declineTerms() {
    // Sign out and cancel
    firebase.auth().signOut();
    closeSheet('terms-acknowledgment-sheet');
    showToast('Sign in cancelled');
}

function showTermsOfService() {
    // Either show in-app modal or open external link
    window.open('https://gameshelf.co/terms', '_blank');
}

function showPrivacyPolicy() {
    window.open('https://gameshelf.co/privacy', '_blank');
}
```

---

## 4. Footer Links

Add links to the landing page and app footer:

### Landing Page Footer
```html
<footer class="footer">
    <p class="footer-copyright">
        © 2026 Game Shelf
    </p>
    <p class="footer-links">
        <a href="/terms">Terms</a> • 
        <a href="/privacy">Privacy</a> • 
        <a href="mailto:support@gameshelf.co">Contact</a>
    </p>
    <p class="footer-disclaimer" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
        Not affiliated with The New York Times, LinkedIn, or any game publisher.
    </p>
</footer>
```

### App Settings Menu
Add under "About" or "Legal" section:
```javascript
// In settings menu
<div class="settings-item" onclick="showTermsOfService()">
    <span>📋 Terms of Service</span>
    <span class="chevron">›</span>
</div>
<div class="settings-item" onclick="showPrivacyPolicy()">
    <span>🔒 Privacy Policy</span>
    <span class="chevron">›</span>
</div>
```

---

## 5. Version Tracking

Track which version of terms each user accepted:

```javascript
// Database structure
users/{uid}/termsAccepted: {
    version: "2026-01-30",    // Terms version
    acceptedAt: 1706644800000 // Timestamp
}
```

### Re-acknowledgment on Major Changes

When terms change significantly:
```javascript
const CURRENT_TERMS_VERSION = '2026-01-30';

async function checkTermsVersion(userId) {
    const snapshot = await db.ref(`users/${userId}/termsAccepted`).once('value');
    const accepted = snapshot.val();
    
    if (!accepted || accepted.version !== CURRENT_TERMS_VERSION) {
        showTermsUpdateNotice();
    }
}
```

---

## 6. Database Rules Update

Add validation for termsAccepted:

```json
"termsAccepted": {
    ".validate": "newData.hasChildren(['version', 'acceptedAt']) && newData.child('version').isString() && newData.child('acceptedAt').isNumber()"
}
```

---

## 7. Third-Party Disclaimer

Add to hint sheet and any place third-party games are mentioned:

```html
<p class="disclaimer" style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 16px;">
    Game Shelf is not affiliated with game publishers. Hints use publicly available information.
</p>
```

---

## 8. Checklist

### Implementation Checklist
- [ ] Create Terms of Service page/modal
- [ ] Create Privacy Policy page/modal
- [ ] Add acknowledgment sheet on first sign-in
- [ ] Record acceptance in database
- [ ] Add footer links to landing page
- [ ] Add settings menu links in app
- [ ] Add third-party disclaimer to hints
- [ ] Update Firebase security rules
- [ ] Test sign-in flow with new acknowledgment
- [ ] Test decline flow (should sign out)

### Content Checklist
- [ ] Review Terms of Service with actual business details
- [ ] Review Privacy Policy for accuracy
- [ ] Confirm support@gameshelf.co is active
- [x] Using David Stewart as operator until LLC is formed
- [ ] Update effective dates before launch

---

## 9. Future Considerations

- **In-app Policy Viewer:** Build a native sheet that renders markdown for Terms/Privacy
- **Cookie Consent:** If adding analytics cookies, implement consent banner
- **Age Gate:** Consider explicit 13+ confirmation for COPPA compliance
- **Localization:** If expanding internationally, translate policies

---

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| TERMS_OF_SERVICE.md | /docs/ | Full Terms of Service |
| PRIVACY_POLICY.md | /docs/ | Full Privacy Policy |
| LEGAL_IMPLEMENTATION.md | /docs/ | This guide |
| LEGAL_LIABILITY_ANALYSIS.md | / | Risk analysis |
