# TheBFG.Team: Institutional Constitution

This document serves as the living source of truth for the BFG Platform's core flows, technical handshake logic, and movement-driven paradigms.

## 1. Membership & Conversion Paradigms

### 1.1 The "Invitation" Paradigm
The app does not "market" to users; it **invites** them. Every prompt for account creation is framed as "Accepting the Invitation" to participate in the conviction economy.

### 1.2 Identity Handshake (Guest Flow 2.1b)
The platform allows exploration without friction, but ensures every action can be reclaimed later.

1.  **Exploration Mode**: Users can "Continue as Guest" from the Login page. 
2.  **Anonymized Activity**:
    *   **Check-ins**: Guests can perform "Ghost Check-ins". These are stored in `ghost_checkins` or recorded as anonymous signals.
    *   **Purchases**: Guests cannot log purchases (requires verified identity for economic force).
3.  **The Prompt**: When entering high-value zones (Profile, Privileges), guests are greeted with the "Why Accept the Invitation?" card.
4.  **Identity Handshake**: Creating an account converts guest-mode "Exploration" into "Provisioned" membership.

---

## 2. Technical Flows (Source of Truth)

### Member 2.1a Intent: "I want to join as a member"
1.  **User Action**: Email/Password -> "Join the Movement".
2.  **Server Handshake**: `onusercreated` trigger creates `users/{uid}`.
3.  **Provisioning**: `isProvisioned: false` -> `true`.
4.  **Stats**: Starts at 0 check-ins, 0 purchases, "Seed" tier.

### Business 2.1 Intent: "I want to register my business"
1.  **Onboarding**: User becomes a Member.
2.  **Application**: Merchant Portal -> "Submit Application".
3.  **Review**: Customer Success "Picks Up" application.
4.  **Publish**: Cloud Function `publishapplication` creates `businesses/{bizId}`.
5.  **Provisioning**: Owner user updated with `isOwner: true`.

---

## 3. UI/UX Standards

### Aesthetic Pillars
- **Vibrancy**: Use feature gradients and glassmorphism.
- **Transparency**: Symmetric loyalty connections (Merchant sees what User sees).
- **Movement-Driven**: Copy should be inspirational, not functional.
