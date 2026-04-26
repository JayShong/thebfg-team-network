# 🔐 BFG Network: Auth & RBAC Flow Manifesto
**Status: VERSION-LOCKED — Requires USER Approval for any modifications.**

## 1. Objective
To maintain a high-performance, cost-efficient, and secure identity resolution system that protects the BFG Network's governance while ensuring a seamless experience for Missionaries and Staff.

## 2. The Two-Key Identity Architecture
The system relies on a dual-source identity model to separate "UI Intent" from "Security Truth."

### Key A: The Firestore User Document (Source of Intent / UI State)
*   **Path**: `users/{uid}`
*   **Purpose**: Stores user profile metadata, stats, and **Role Flags** (`isSuperAdmin`, `isAuditor`, `isCustomerSuccess`, `isOwner`, `isBusinessStaff`).
*   **Role**: Used by the frontend (React) to determine which UI elements, buttons, and portals to render.
*   **Performance**: Cached in `localStorage` for optimistic UI rendering and immediate response.

### Key B: Auth Custom Claims (Source of Truth / Security State)
*   **Location**: Secure JWT within the Firebase Auth ID Token.
*   **Purpose**: Cryptographically signed proof of administrative roles.
*   **Role**: The **only** source checked by Firestore Security Rules for administrative access.
*   **Integrity**: Claims are immutable on the client; they can only be changed by the Backend (Cloud Functions).

---

## 3. The Lifecycle Flow

### 3.1 Session Restore / Login
1.  `onAuthStateChanged` detects a valid user session.
2.  **Identity Resolution (Sync 1)**: The app fetches the current ID Token and extracts **Custom Claims**.
3.  **Profile Resolution (Sync 2)**: The app fetches the Firestore `users/{uid}` document.
4.  **Merged Resolution**: The `AuthContext` merges roles from both sources. 
    *   *Result*: If a role exists in Firestore but not in the Claims yet, the UI still shows the portal (Resilience).

### 3.2 Server-Side Provisioning
Upon the creation of a new Auth account (via Login or Sign-up), a **Cloud Function** is triggered to:
1.  Initialize the `users/{uid}` document with default stats (0 check-ins, 0 purchases).
2.  Assign the default 'member' access rights.
3.  The frontend waits for this document to appear before completing the login transition.

---

## 4. Permission Taxonomy (Roles)

The BFG Network uses a dual-tiered staff architecture to separate platform governance from business operations.

### 4.1 Network Staff (Platform Governance)
Responsible for maintaining the network standards and supporting the community.
*   **SuperAdmin**: Full system access. Manages platform-level roles and security.
*   **Customer Success**: **(PRIMARY SUPPORT)** Manages the onboarding pool, supports Business Owners in navigating the app, and performs the final "Publish" action for new businesses.
*   **Auditor**: Independent verification staff. Conducts yearly assessments and assigns BFG Scores.

### 4.2 Merchant Staff (Business Operations)
Responsible for the day-to-day operations of a specific onboarded business.
*   **Business Owner**: The founder/legal owner of the business. Full control over their Business Portal.
*   **Business Manager**: Staff authorized by the owner to manage profile details and intelligence data.
*   **Crew**: **(OPERATIONAL)** Responsible for handling customer scannings, recording check-ins, and performing purchase verifications at the point of sale.

---

## 5. Security Gatekeepers

### 5.1 Frontend: `ProtectedRoute`
A React component that gates access to routes (e.g., `/admin`, `/business-portal`).
*   Supports `allowStaff={true}` to allow business owners/managers into merchant-level tools.
*   Checks the `currentUser` object (hydrated by `AuthContext`).

### 5.2 Backend: Firestore Security Rules
The final wall of defense. 
*   Uses `isSuperAdmin()` and `isAuditor()` functions to check `request.auth.token`.
*   Does **not** trust the user document for write access to system-critical collections.

---

## 6. User Intent Flows (Cognitive Mapping)

### 6.1 Intent: "I want to join the movement (Universal Access)"
> [!IMPORTANT]
> **NEW PRIMARY FLOW: SERVER-SIDE AUTHORITY**
> **Approved**: 2026-04-26

1.  **User Action**: User enters email/password on the Login page and clicks **"Join the Movement"**.
2.  **Creation Logic**: If the email is not in the database, a new Auth account is created.
3.  **Server Provisioning**: A `functions.auth.user().onCreate()` trigger fires on the server.
    *   **Action**: Creates the `users/{uid}` document.
    *   **Data**: Populates personal stats (check-ins, verified purchases) and default user access rights.
4.  **Frontend Receipt**: The `AuthContext` listens for this document. Once it arrives, a copy is sent to the frontend state.
5.  **Completion**: The login process is finished, and the user is redirected to their Dashboard.

### 6.2 Intent: "I want to register my business on the BFG Network"
*   **Step 1: Onboarding (Becoming a Member)**
    *   **URL**: `/` (Auth Redirect to Login)
    *   **Action**: User signs up or logs in to the platform.
    *   **Technical Trigger**: `Login.jsx` -> `handleLogin()`
    *   **Logic**: `onAuthStateChanged` in `AuthContext.jsx` detects the user and waits for the server-side `users/{uid}` profile.
*   **Step 2: Navigation**
    *   **URL**: `/profile`
    *   **Action**: User navigates to the Merchant Portal (Staff) from their profile.
*   **Step 3: Intent to Apply**
    *   **URL**: `/merchant-portal` (Application Tab)
    *   **Action**: User fills in details and clicks "Submit Application".
*   **Step 4: Submission**
    *   **Action**: Writes to `applications/{appId}` with status `pending`.

---

## 7. Constraint Checklist for Agents
*   [ ] **Server-Side Initialization**: All user profiles must be initialized by Cloud Functions, never by the client.
*   [ ] **No Hardcoded Emails**: Never use static email addresses for permission gates.
*   [ ] **Claim Dominance**: Administrative data access must always be gated by Auth Claims.
*   [ ] **Manual Reconciliation**: Provide a manual "Refresh Permissions" tool for staff members to reconcile claims on-demand.

---

**ANY CHANGE THAT VIOLATES OR MODIFIES THESE FLOWS REQUIRES EXPLICIT USER APPROVAL.**
