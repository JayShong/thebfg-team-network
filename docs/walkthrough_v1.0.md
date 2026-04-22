# Walkthrough: Institutional Hardening & The Sentinel (v1.0)

This document summarizes the comprehensive platform hardening and abuse mitigation architecture implemented to protect the BFG Platform's data integrity.

---

## 1. Tri-Portal Architecture
The platform has been strictly partitioned into three distinct operational zones to ensure separation of powers and institutional oversight.

### **Zone A: Governance Portal (`/admin`)**
*   **Authority**: `Superadmin` (jayshong@gmail.com)
*   **Key Features**:
    - **Identity Clearing**: A centralized queue to review and clear users flagged by the Sentinel.
    - **Role Management**: Assigning and revoking staff roles (Auditors, Merchant Assistants).
    - **Lockout Reset**: Instant resolution for users caught in security-triggered timers.

### **Zone B: Merchant Portal (`/merchant-portal`)**
*   **Authority**: `Merchant Assistant`, `Superadmin`
*   **Key Features**:
    - **Merchant Onboarding**: Standardized database entry for new businesses.
    - **Asset Generation**: Real-time QR Standee generation with branding.
    - **Database Search**: Fast search by Founder, Name, or ID (Slug).

### **Zone C: Audit Hub (`/audit-hub`)**
*   **Authority**: `Auditor`, `Superadmin`
*   **Key Features**:
    - **Compliance Workflow**: A multi-step Approval/Rejection loop for ISO53001 verification.
    - **Supervisor Queue**: Hierarchical review of impact narratives.

---

## 2. The Sentinel: Abuse Mitigation
A proactive, automated layer designed to prevent impact farming and maintain the platform's credibility.

### **Temporal Constraints**
*   **1 Per Day**: Users can only check in at the same business once every 24 hours (resets at midnight).
*   **Merchant Rotation**: There are **no global time restrictions** if the user is visiting *different* merchants. This encourages healthy network exploration.
*   **5-Minute Purchase Cooldown**: Prevents accidental or malicious spamming of the merchant's verification queue.

### **Security Penalties**
*   **The 3-Strike Rule**: Attempting to scan the same merchant 3 times in a single day triggers a **10-minute scanner lockout**.
*   **Identity Flags**: Suspicious temporal patterns trigger a global `isFlagged` status.
*   **Suspension UX**: Flagged users are blocked with a clear directive: *"You have been naughty. Contact Jason at our Facebook page for help."*

---

## 3. Data Integrity & Verification
Ensuring that "Impact Volume" represents genuine, audited economic behavior.

*   **Verified-Only Stats**: Global "Total Volume" and "Purchase Count" now only increment once a merchant **Verifies** the transaction.
*   **Edit Pending**: Users have the power to fix mistakes. If a purchase is logged incorrectly, the user can edit the amount via their **Profile History** as long as it remains `pending`.
*   **Background Trigger**: The `ontransactionupdated` Cloud Function ensures that stats remain synchronized and resistant to client-side manipulation.

---

## 4. Security Hardening
*   **Firestore Rules**: Locked down `system/` documents and restricted staff roles from self-modifying their privileges.
*   **RBAC Partitioning**: Removed privilege leaks in the Auth layer, ensuring that "Merchant Assistant" access does not grant "Superadmin" governance.
*   **Anonymized Auditing**: Full PII scrubbing logic remains active for GDPR compliance during account deletions.

---

**The BFG Platform is now production-ready for institutional Malaysia.**
*   **Project Console**: [Firebase Overview](https://console.firebase.google.com/project/thebfgteam-9643a/overview)
*   **Live Web App**: [thebfgteam-9643a.web.app](https://thebfgteam-9643a.web.app)
