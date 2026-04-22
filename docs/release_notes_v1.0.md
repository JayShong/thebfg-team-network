# BFG Platform: Release Notes (v0.96 -> v1.0)

This document tracks the evolution of the platform from its React migration phase to its current state as a hardened, institutional-grade ecosystem.

---

## **v1.0: The Sentinel (Current)**
*Focus: Institutional Hardening & Identity Governance*
*   **Flagged Identities**: Added a Governance queue for Superadmin to clear suspicious accounts.
*   **Security Patching**: Restored strict RBAC partitioning (Fixed Superadmin privilege leak for staff).
*   **Identity Suspension**: Hardened scanner to block globally flagged users indefinitely.
*   **Suspension UX**: Integrated Facebook community support instructions for suspended users.
*   **Portal Navigation**: Added "Back to Profile" nodes across all operational portals.
*   **UI Sweep**: Renamed founder dashboards to "Business Dashboard" to avoid confusion with staff portals.

## **v0.99: Data Integrity**
*Focus: Verified Economic Impact*
*   **Verified-Only Stats**: Purchase volume only increments once a merchant verifies the transaction.
*   **Edit Pending**: Users can fix mistakes in their purchase logs while they are still `pending`.
*   **Verification Trigger**: Automated backend synchronization between verified transactions and global network stats.

## **v0.98: Sentinel Genesis**
*Focus: Proactive Abuse Mitigation*
*   **The Sentinel Layer**: Implemented a security subcollection to track user temporal behavior.
*   **Daily Check-in Limits**: Restricted users to 1 check-in per merchant per day.
*   **Merchant Rotation**: Enabled zero-cooldown support for different businesses in one session.
*   **Spam Penalty**: Implemented the "3-Strike" 10-minute automated scanner lockout.

## **v0.97: Tri-Portal Foundation**
*Focus: Organizational Partitioning*
*   **Tri-Portal Architecture**: Split the platform into Governance (`/admin`), Merchant Portal (`/merchant-portal`), and Audit Hub (`/audit-hub`).
*   **Staff Roles**: Formalized "Merchant Assistant" and "Auditor" roles with specific permissions.
*   **Support Workspace**: Enabled staff to manage business narratives and onboarding without owner credentials.

---

**Current Ecosystem State:**
*   **Version**: 1.0 (The Sentinel)
*   **Status**: Hardened & Institutional Ready
*   **Core Systems**: Identity Guard, Network Stats Trigger, ISO53001 Audit Workflow.
