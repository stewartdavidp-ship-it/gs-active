# Game Shelf Legal & Liability Analysis

**Generated:** January 30, 2026  
**Reviewed:** gs-active-2026-01-30-v9  
**Status:** Risk Assessment & Recommendations

---

## Executive Summary

Game Shelf operates in several legally sensitive areas: third-party IP usage, payments/virtual currency, AI services, user data, and competitive gaming. This document identifies risks, rates severity, and provides mitigation recommendations.

**Overall Risk Level:** MODERATE - Most risks are manageable with proper documentation and policies.

---

## 1. Third-Party Game IP Issues

### 1.1 Current Exposure

| Item | Status | Risk |
|------|--------|------|
| Using game names (Wordle, Connections, etc.) | Active | 🟡 Medium |
| Parsing share text formats | Active | 🟢 Low |
| Displaying emoji grids | Active | 🟢 Low |
| Linking to game sites | Active | 🟢 Low |
| AI hints revealing game answers | Active | 🟠 Medium-High |

### 1.2 Games Referenced

**NYT Games:** Wordle, Connections, Strands, Spelling Bee, Mini Crossword, Letter Boxed, Tiles, Vertex  
**LinkedIn Games:** Pinpoint, Queens, Crossclimb, Tango  
**Others:** Quordle, Worldle, Tradle, Framed, Moviedle, Heardle, Waffle, Nerdle, and ~20 more

### 1.3 Legal Analysis

**Trademark Use**
- Using game names is likely **nominative fair use** (describing compatibility)
- You're not claiming to BE Wordle, you're tracking results FROM Wordle
- Similar to how fitness apps track "Apple Watch" workouts

**Share Text Parsing**
- Share text is user-generated content that users voluntarily paste
- No scraping or unauthorized access
- Similar to how Twitter displays embedded content

**AI Hints Concern**
- Providing hints/answers to paid games (NYT) could be seen as:
  - Facilitating "cheating" (ethical, not legal)
  - Undermining subscription value (potential tortious interference)
  - Derivative use of game content (weakest argument)

### 1.4 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 High | Add disclaimer: "Not affiliated with NYT, LinkedIn, etc." | 30 min |
| 🔴 High | Remove any official game logos/icons you don't own | 1 hour |
| 🟡 Medium | Consider limiting hints for paid/subscription games | 2 hours |
| 🟡 Medium | Monitor for takedown requests, have response plan | Ongoing |
| 🟢 Low | Reach out to game companies proactively (optional) | Variable |

**Suggested Disclaimer Text:**
```
Game Shelf is an independent tracking app not affiliated with, endorsed by, 
or sponsored by The New York Times, LinkedIn, or any game publisher. 
Game names are trademarks of their respective owners.
```

---

## 2. Virtual Currency & Payments

### 2.1 Current Implementation

| Currency | Source | Use | Cash Value |
|----------|--------|-----|------------|
| Tokens | Free (signup, referrals) | AI hints, battles | No |
| Coins | Purchased ($1 each) | Battles, rewards shop | No (one-way) |

### 2.2 Legal Considerations

**Money Transmitter Laws**
- Applies when: transmitting money between parties
- Game Shelf status: **NOT a money transmitter** because:
  - Coins cannot be converted back to cash
  - Coins cannot be transferred between users
  - No fiat currency flows between users

**Virtual Currency Regulations**
- Various states have different rules for virtual currency
- Key protections in place:
  - ✅ Clear disclosure of no cash value
  - ✅ No real-money cashout
  - ✅ No peer-to-peer transfer
  - ⚠️ Need clear terms of service

**Consumer Protection**
- Users who purchase coins have consumer rights
- Need: refund policy, service discontinuation terms, dispute resolution

### 2.3 Battle Wagers - Gambling Analysis

**Current Safeguards:**
- $5 max wager (50 coins)
- Skill-based (puzzle performance), not chance
- No real money prizes
- No cashout mechanism

**Gambling Law Checklist:**

| Element | Game Shelf | Notes |
|---------|------------|-------|
| Consideration (payment) | Yes (coins) | But coins have no cash value |
| Chance | Minimal | Skill-based puzzles |
| Prize | Yes (coins) | But no cash conversion |

**Assessment:** Game Shelf battles are likely **NOT gambling** under most jurisdictions because:
1. Skill predominates over chance
2. Prizes have no cash value and can't be converted
3. Similar to fantasy sports or arcade prize redemption

**However:** Some jurisdictions (especially international) have broader definitions.

### 2.4 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 High | Create Terms of Service with virtual currency disclosures | 4 hours |
| 🔴 High | Create refund policy for coin purchases | 1 hour |
| 🟡 Medium | Add age restriction (13+ or 18+ for battles) | 2 hours |
| 🟡 Medium | Add gambling disclaimer in battle UI | 1 hour |
| 🟢 Low | Consult attorney re: international gambling laws if scaling | Variable |

---

## 3. AI Services (Claude API)

### 3.1 Current Implementation

- Using Claude Haiku via API for hints
- Web search enabled for real-time game answers
- Rate limited (20/hour, 50/day per user)
- User pays 5 tokens per hint

### 3.2 Legal Considerations

**Anthropic Acceptable Use Policy**
- ✅ Not generating harmful content
- ✅ Not using for manipulation
- ⚠️ Providing game answers = check if this violates game ToS

**AI Output Liability**
- AI hints could theoretically be wrong
- Users might complain about "bad hints"
- Need disclaimer that hints are AI-generated and not guaranteed

**Rate Limiting Disclosure**
- Currently have technical limits
- Should disclose limits to users

### 3.3 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🟡 Medium | Add disclaimer: "AI hints are generated by AI and may be incorrect" | 30 min |
| 🟡 Medium | Ensure Anthropic ToS compliance for use case | 1 hour |
| 🟢 Low | Add user consent for AI features | 1 hour |

---

## 4. User Data & Privacy

### 4.1 Data Collected

| Data Type | Purpose | Storage | Shared? |
|-----------|---------|---------|---------|
| Google profile (name, email, photo) | Account identification | Firebase | With friends only |
| Game history & stats | Core functionality | Firebase | Friends see limited view |
| Purchase history | Transaction records | Firebase + Stripe | No |
| Device info | Analytics | Firebase | No (aggregated only) |
| IP address | Security/fraud prevention | Server logs | No |

### 4.2 Compliance Requirements

**GDPR (if serving EU users):**
- [ ] Privacy policy with GDPR disclosures
- [ ] Data export capability (partial - FAQ mentions this)
- [ ] Account deletion (✅ implemented)
- [ ] Cookie consent (if using cookies)
- [ ] Legal basis for processing

**CCPA (California users):**
- [ ] Privacy policy with CCPA disclosures
- [ ] "Do Not Sell My Info" (if applicable)
- [ ] Data deletion rights (✅ implemented)

**COPPA (if under-13 users):**
- No explicit age gate
- Google auth may provide some protection
- Consider adding 13+ age requirement

### 4.3 Current Privacy Gaps

From FAQ.md:
> "Your puzzle results, stats, and activity. If signed in, your Google profile info (name, email, photo) for identification."

This is good but needs formal privacy policy.

### 4.4 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 High | Create formal Privacy Policy | 4-6 hours |
| 🔴 High | Add privacy policy link to landing page & app | 30 min |
| 🟡 Medium | Add age verification (13+) | 2 hours |
| 🟡 Medium | Add data export feature (fuller implementation) | 4 hours |
| 🟡 Medium | Cookie consent if using tracking cookies | 2 hours |
| 🟢 Low | GDPR-specific data processing agreement | 2 hours |

---

## 5. Payment Processing (Stripe)

### 5.1 Current Implementation

- Stripe Checkout for coin purchases
- Webhook for payment confirmation
- Chargeback handling implemented
- Purchase limits: $50/day, $200/week

### 5.2 Compliance

**PCI DSS:**
- ✅ Handled by Stripe (no card data touches your servers)
- ✅ Using Stripe Checkout (fully hosted)

**Stripe ToS:**
- Review restricted businesses list
- Games/gaming usually allowed
- Gambling is restricted (but we're not gambling)

### 5.3 Chargeback Handling

From SECURITY_AUDIT.md - well implemented:
- Auto-deduct coins on dispute
- Flag account
- Lock purchases

### 5.4 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🟡 Medium | Create refund policy page | 1 hour |
| 🟡 Medium | Document chargeback process for users | 1 hour |
| 🟢 Low | Enable Stripe Radar rules (high-risk prevention) | 1 hour |

---

## 6. Content & User Behavior

### 6.1 User-Generated Content

- Display names (validated to 50 chars, but no content filter)
- Battle names (validated to 100 chars)
- Potential for offensive names

### 6.2 Security Measures in Place

From firebase-patterns and security audit:
- ✅ XSS prevention (escapeHtml)
- ✅ Input validation
- ✅ Firebase security rules

### 6.3 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 🟡 Medium | Add profanity filter for display names | 2 hours |
| 🟡 Medium | Add report user feature | 4 hours |
| 🟢 Low | Moderation queue for reported content | 4 hours |

---

## 7. Required Legal Documents

### 7.1 Minimum Viable Legal Package

| Document | Status | Priority |
|----------|--------|----------|
| Terms of Service | ❌ Missing | 🔴 Critical |
| Privacy Policy | ❌ Missing | 🔴 Critical |
| Refund Policy | ❌ Missing | 🔴 High |
| Cookie Policy | ❌ Missing | 🟡 Medium |
| DMCA/Copyright Policy | ❌ Missing | 🟢 Low |

### 7.2 Terms of Service Outline

```
1. Acceptance of Terms
2. Description of Service
3. Account Registration & Security
4. Virtual Currency (Tokens & Coins)
   - No cash value
   - No refunds except as required by law
   - Service termination terms
5. User Conduct
   - Prohibited activities
   - Cheating policy
6. Battles & Competitions
   - Skill-based nature
   - Entry fee terms
   - Prize distribution
7. AI Features
   - AI-generated content disclaimer
   - No guarantee of accuracy
8. Third-Party Games
   - Not affiliated with game publishers
   - Trademark acknowledgments
9. Intellectual Property
10. Limitation of Liability
11. Dispute Resolution
12. Termination
13. Changes to Terms
14. Contact Information
```

### 7.3 Privacy Policy Outline

```
1. Information We Collect
   - Account info (Google profile)
   - Game data
   - Purchase history
   - Device/usage data
2. How We Use Information
3. Information Sharing
4. Data Retention
5. Your Rights (GDPR/CCPA)
6. Children's Privacy
7. Security
8. Changes to Policy
9. Contact
```

---

## 8. Risk Summary Matrix

| Risk Area | Likelihood | Impact | Overall | Status |
|-----------|------------|--------|---------|--------|
| Third-party IP complaint | Low | Medium | 🟡 | Monitor |
| Payment/chargeback fraud | Medium | Medium | 🟡 | Mitigated |
| Gambling classification | Low | High | 🟡 | Mitigated |
| Privacy violation | Low | High | 🟡 | Needs docs |
| AI hint liability | Low | Low | 🟢 | Low risk |
| User content issues | Low | Low | 🟢 | Mitigated |
| Data breach | Low | High | 🟡 | Firebase secure |

---

## 9. Priority Action Items

### Immediate (Before Wider Launch)

1. **Create Terms of Service** - 4-6 hours
2. **Create Privacy Policy** - 4-6 hours  
3. **Add trademark disclaimer** - 30 min
4. **Add refund policy** - 1 hour
5. **Add age verification (13+)** - 2 hours

### Near-Term (Next 30 Days)

6. Add gambling/skill disclaimer to battles
7. AI hint accuracy disclaimer
8. User content reporting system
9. Data export feature completion
10. Cookie consent (if applicable)

### Ongoing

11. Monitor for IP complaints
12. Review security audit findings weekly
13. Update policies as features change
14. Consider legal consultation before major scaling

---

## 10. Business Entity Considerations

Currently: Appears to be operating as individual/sole proprietor

**Recommendations:**
- Form LLC to separate personal liability
- Register "Game Shelf" trademark if scaling
- Consider "Stewartstuff LLC" (mentioned in past docs) formalization
- Maintain clear records of income/expenses

---

## Appendix A: Template Disclaimer Language

### Footer Disclaimer
```
© 2026 Game Shelf. Not affiliated with The New York Times, LinkedIn, or any 
game publisher. Game names and trademarks are property of their respective owners.
```

### AI Hint Disclaimer
```
Hints are generated by AI and may not always be accurate. Use at your own discretion.
Game Shelf is not responsible for hint quality or game outcomes.
```

### Virtual Currency Disclaimer
```
Tokens and Coins are virtual items with no cash value. They cannot be exchanged 
for real currency or transferred to other users. Purchases are final except as 
required by applicable law.
```

### Battle Disclaimer
```
Battles are skill-based competitions. Entry fees and prizes are in virtual currency 
only. This is not gambling. Participation requires acceptance of battle rules.
```

---

## Appendix B: Resources

- Anthropic Acceptable Use Policy: https://www.anthropic.com/policies
- Stripe Restricted Businesses: https://stripe.com/legal/restricted-businesses
- FTC Virtual Worlds Guide: https://www.ftc.gov/
- GDPR Overview: https://gdpr.eu/
- CCPA Overview: https://oag.ca.gov/privacy/ccpa

---

*This analysis is for informational purposes and does not constitute legal advice. 
Consult with a licensed attorney for specific legal guidance.*
