# Technical Handbook: The BFG.Team (v0.9)
*Final Baseline for Version 0.9 — Generated on 2026-04-18*

This document serves as the architectural blueprint and operational manual for The BFG.Team platform. It provides the necessary context for any third party to understand, maintain, and recreate the system from scratch.

---

## 1. Project Manifesto: The 30% Mission
The primary objective of The BFG.Team is to contribute to **30% of Malaysia's GDP by 2027** through the "Empathy Economy." 

### The Theory of Change
We believe that systemic economic change happens not through grand isolated acts, but through **habitual, micro-decisions**. By gamifying the support of "for-good" (BFG) businesses, we transform consumers into "Missionaries" who drive capital toward empathetic founders.

---

## 2. Systems Architecture: The Badge Hierarchy
The core engine of Version 0.9 is the **Categorical Loyalty System**. Unlike linear points-based systems, our system measures three distinct dimensions of engagement: **Seen**, **Verified**, and **Valued**.

### 2.1 The Three Pillars
| Pillar | Focus | Metric | Design Intent |
| :--- | :--- | :--- | :--- |
| **Seen** | Discovery | Unique Check-ins | Making for-good businesses discoverable and breaking "comfort zone" routines. |
| **Verified** | Standard | Impact Alignment | Normalizing audited impact (ISO53001) as a benchmark for consumer choice. |
| **Valued** | Appreciation | Habit & Spend | Making founders feel noticed, appreciated, and financially sustained. |

### 2.2 Tier Progression & Mastery
Progression is non-linear and requires **Categorical Mastery**. Meeting a badge count is not enough; you must prove commitment across all pillars.

| Tier | Badge Count | Mastery Requirement |
| :--- | :--- | :--- |
| **Blue** | 0 - 5 | Entry level — start of the journey. |
| **Silver** | 5 | Must have at least 3 **'Seen'** badges. |
| **Gold** | 12 | Must have **Silver** + at least 5 **'Valued'** badges. |
| **Platinum** | 20 | Must have **Gold** + at least 5 **'Verified'** badges. |

---

## 3. Technical Implementation
The platform is built as a highly performant **Progressive Web App (PWA)** using a vanilla stack for maximum longevity and zero dependency bloat.

### 3.1 The Configuration Engine (`app.js`)
The entire badge system is driven by a single JSON configuration object. This allows for rapid scaling without rewriting logic.

```javascript
const BADGES_CONFIG = [
    { 
        id: 'seen_explorer', 
        title: 'The Explorer', 
        category: 'Seen', 
        icon: 'fa-compass',
        why: 'Discovery is the first step...',
        how: 'Earned by checking in at 3 unique businesses.',
        actionTarget: 'directory'
    },
    // ... 30+ additional badges
];
```

### 3.2 Key Logic Engines
*   **`evaluateBadges(user)`**: Scans the user's activity log against `BADGES_CONFIG` criteria (loops, streaks, timestamps).
*   **`getUserTier(user)`**: Calculates the tier status and identifies the specific "Missing Category" blocking the next rank.
*   **`renderPrivileges()`**: A dynamic DOM generator that groups badges by category, calculates seasonal days remaining, and renders the interactive progression card.

---

## 4. Design Philosophy
We prioritize a **"Premium Missionary"** aesthetic—utilizing rich dark modes and glassmorphism to make ethical consumption feel elite and aspirational, rather than charitable and sacrificial.

### 4.1 Visual Tokens
- **Background**: `#0a0e1a` (Deep Space Dark).
- **Cards**: `Glassmorphism` (Semi-transparent with backdrop-blur).
- **Typography**: `Inter` & `Outfit` (Modern, geometric, high readability).
- **Vibrancy**: HSL-based primary colors for high-contrast accessibility.

### 4.2 Emotional UI (EUI)
We use **Narrative-Driven Modals**. When a user clicks a badge, we don't just show a status; we explain the **Why** (Mission relevance), the **How** (Acquisition instructions), and the **Action** (Direct CTA to act now).

---

## 5. Re-creation Guide (For Third Parties)

### Step 1: Environment Setup
1. Initialize a vanilla HTML5/JS project.
2. Include **FontAwesome 6.4+** for the iconography.
3. Configure a **Firebase Project** with Authentication and Firestore enabled.

### Step 2: Deployment (Firebase Hosting)
Initialize the project in the same directory as your source files:
```bash
firebase init hosting
# Select your project, set public directory to '.'
firebase deploy
```

### Step 3: Persistence Flow
Ensure the user object remains synced:
1. Load from **localStorage** for instant UI response (Optimistic UI).
2. Fetch from **Cloud Firestore** to reconcile data.
3. Save back to both after every significant activity (Scan, Purchase, Unlock).

---

> [!TIP]
> **Version 0.9 Identity**: Always look for the `APP_VERSION` constant at the top of `app.js`. This version ensures that the "Simulate Scan" button is removed, $ is converted to RM, and all variables have been transitioned to production names (`currentUser`, `networkStats`, etc.).

> [!IMPORTANT]
> **Seasonal Resets**: The `CURRENT_SEASON` object in `app.js` controls the reset cycle. When the `endDate` is passed, the system is designed to transition the network to the next mission phase via seasonal achievement arcs.
