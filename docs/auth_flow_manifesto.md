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

### 3.2 The Self-Healing Mechanism (Background Sync)
If the `AuthContext` detects that the Firestore Document has an elevated role flag that is missing from the Auth Claims, it triggers an automated **background synchronization**:
1.  Calls `syncuserclaims()` (Cloud Function).
2.  The function verifies the Firestore intent and updates the Auth Custom Claims.
3.  The frontend forces an ID Token refresh (`getIdToken(true)`).
4.  The security state is now synchronized without user intervention.

### 3.3 Quota-Friendly Stewardship (Ownership)
To avoid expensive `where` queries on every load:
1.  Ownership and Manager/Crew status are consolidated within the `users/{uid}` document.
2.  The frontend uses this consolidated record to grant access to the **Business Portal**.
3.  Security is maintained because the Firestore rules verify ownership by comparing the `request.auth.token.email` against the `resource.data.ownerEmail`.

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

### 4.3 Identity Infrastructure
Identity is split into two layers:
1.  **UI Level (Speed)**: Firestore boolean flags (e.g., `isCustomerSuccess: true`) trigger portal visibility.
2.  **Security Level (Truth)**: Firebase Auth Custom Claims (JWT) gate all write operations and Cloud Functions.

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
This section maps human objectives to the underlying technical machinery.

### 6.1 Intent: "I want to register my business on the BFG Network"
> [!IMPORTANT]
> **LOCK STATUS: VERIFIED & FROZEN**
> **Last Approved**: 2026-04-26 (User Session)

*   **Step 1: Onboarding (Becoming a Member)**
    *   **URL**: `/` (Auth Redirect to Login)
    *   **Action**: User signs up or logs in to the platform.
    *   **Technical Trigger**: `Login.jsx` -> `handleLogin()`
    *   **Logic**: `onAuthStateChanged` in `AuthContext.jsx` detects the user and initializes the `users/{uid}` profile.
*   **Step 2: Navigation**
    *   **URL**: `/profile`
    *   **Action**: User navigates to the Merchant Portal (Staff) from their profile.
    *   **Technical Trigger**: `Profile.jsx` -> `navigate('/merchant-portal')`
    *   **Gate**: `ProtectedRoute.jsx` ensures the user is at least a 'member' (logged in).
*   **Step 3: Intent to Apply**
    *   **URL**: `/merchant-portal` (Application Tab)
    *   **Action**: User views the application form.
    *   **Technical Trigger**: `OnboardingHub.jsx` renders the form fields.
    *   **Data Schema (The Application Form)**:
        *   **Shop / Brand Name** [REQUIRED]: Publicly visible consumer name.
        *   **Founder Name** [OPTIONAL]: The individual driving the business.
        *   **Contact Phone** [REQUIRED]: Primary business contact.
        *   **Registered Email** [REQUIRED]: Read-only; synced with owner account.
        *   **Company Registration No.** [OPTIONAL]: SSM / Legal identification for verification.
        *   **Industry** [OPTIONAL]: Dropdown selection from 19 predefined categories.
        *   **Location / Area** [OPTIONAL]: Local neighborhood (e.g. Bangsar).
        *   **Google Maps Link** [OPTIONAL]: Direct link to physical location (`googleMapsUrl`).
        *   **Full Address** [OPTIONAL]: Complete street address.
        *   **Purpose Statement** [OPTIONAL]: The "Why" behind the business (`purposeStatement`).
        *   **Founder's Story** [OPTIONAL]: Narrative of convictions and journey.
*   **Step 4: Submission**
    *   **URL**: `/onboarding-hub`
    *   **Action**: User fills in details and clicks "Submit Application".
    *   **Technical Trigger**: `OnboardingHub.jsx` -> `handleSubmit()`
    *   **Data Action**: Writes to `applications/{appId}` with status `pending`.
    *   **Security**: `firestore.rules` validates that `request.auth.token.email == request.resource.data.email`.
*   **Step 5: Review & Assignment (Customer Success)**
    *   **URL**: `/merchant-portal`
    *   **Action**: A Customer Success member reviews the new intake pool and "Picks Up" the application.
    *   **Technical Trigger**: `OnboardingHub.jsx` -> `handlePickUp()`
    *   **Data Action**: Calls `assignapplication` (Cloud Function) to set `assignedTo` field.
*   **Step 6: Collaborative Refinement**
    *   **The Window**: Even after an application is "Picked Up", the **Business Owner** retains full edit access to their draft. This allows Customer Success to support the owner in real-time (e.g., via phone/chat) to improve their Purpose Statement or Story before publication.
    *   **Action**: Owner edits via `Profile.jsx` -> `ApplicationEditor.jsx`.
*   **Step 7: Publishing (Customer Success)**
    *   **URL**: `/merchant-portal`
    *   **Action**: Once both parties are satisfied, Customer Success clicks "Publish Business."
    *   **Technical Trigger**: `OnboardingHub.jsx` -> `handlePublish()`
    *   **Data Action**: Calls `publishapplication` (Cloud Function).
*   **Step 8: Provisioning (Backend)**
    *   **URL**: N/A (Server-side Trigger)
    *   **Technical Trigger**: `functions/index.js` -> `onApplicationApproved` (or equivalent Publish Trigger)
    *   **Action A**: Automatically creates the `businesses/{bizId}` document.
    *   **Action B**: Updates the owner's `users/{uid}` profile with `isOwner: true`.
*   **Step 9: Activation (Portal Access)**
    *   **URL**: `/profile`
    *   **Action**: User returns to their profile.
    *   **Technical Trigger**: `AuthContext.jsx` -> `onAuthStateChanged` / Re-fetch.
    *   **Logic**: Stewardship detection identifies the `isOwner` flag.
    *   **UI Result**: The "Business Portal" button appears in `Profile.jsx`.

### 6.2 Intent: "I am Network Staff and I need to manage platform roles"
*   **Step 1: Identity Handshake**
    *   **URL**: `/` (Auth Redirect to Login)
    *   **Action**: User logs in.
    *   **Technical Trigger**: `AuthContext.jsx` -> `onAuthStateChanged`
    *   **Logic**: `getIdTokenResult()` extracts secure **Custom Claims**.
    *   **The Security Protocol (Why Claims?):**
        *   **Custom Claims** are part of the user's encrypted Identity Token (JWT). They are signed by Google and are **immutable** from the client-side. This prevents a user from "spoofing" their role by editing their own Firestore document.
        *   **User Docs** are used for UI speed (showing/hiding buttons), but **Claims** are used for the actual Security Rules and Cloud Functions.
        *   **Quota Optimization**: Security rules can check `request.auth.token.isSuperAdmin` without performing a Firestore Read on the `users` collection, significantly reducing quota usage.
*   **Step 2: Portal Entry**
    *   **URL**: `/admin`
    *   **Action**: User (SuperAdmin) clicks "Governance Hub".
    *   **Technical Trigger**: `ProtectedRoute.jsx` checks `currentUser.isSuperAdmin`.
*   **Step 3: Role Management**
    *   **URL**: `/admin`
    *   **Action**: SuperAdmin assigns the **Customer Success** or **Auditor** role to a member.
    *   **Technical Trigger**: `Admin.jsx` -> `handleUpdate()`
    *   **Data Action**: Calls `managerole()` (Cloud Function) which updates the `system/compliance_roles` list and promotes flags to the user's Auth Claims.

### 6.3 Intent: "I am a Crew member and I need to verify a customer visit"
*   **Step 1: Operational Access**
    *   **URL**: `/business-portal`
    *   **Action**: Crew member enters the portal of their assigned business.
    *   **Gate**: `ProtectedRoute.jsx` checks `currentUser.isBusinessStaff`.
*   **Step 2: Verification Action**
    *   **URL**: `/business-portal` (Scanner Section)
    *   **Action**: Crew scans a customer's card or reviews the "Purchase Verification Queue".
    *   **Technical Trigger**: `BusinessPortal.jsx` -> `handleVerify()`
    *   **Logic**: Updates `transactions/{id}` status to `verified`.

---

## 6. Constraint Checklist for Agents
Any modification to the Auth or RBAC systems **MUST** adhere to these constraints:
*   [ ] **No Hardcoded Emails**: Never use static email addresses for permission gates.
*   [ ] **Claim Dominance**: Administrative data access must always be gated by Auth Claims in security rules.
*   [ ] **Self-Healing**: Always ensure a mechanism exists to sync Claims from Firestore intent.
*   [ ] **Quota Efficiency**: Avoid multi-collection queries during the initial auth handshake.
*   [ ] **UI Resilience**: Show portals based on Firestore flags while claims are in flight.

---

**ANY CHANGE THAT VIOLATES OR MODIFIES THESE FLOWS REQUIRES EXPLICIT USER APPROVAL.**
