# Security Specification for Pilah Sampah RT 005

This document details the security specification, invariants, and threat vectors ("Dirty Dozen" payloads) to ensure a Zero-Trust Firestore database configuration.

## 1. Data Invariants
- **Identity Invariant**: Users can never register themselves with administrative privileges (`role: 'admin'`). Any new user creation must default to `role: 'citizen'`.
- **Relational Integrity**: Trash deposits must be associated with an existing user ID matching the active authenticated user's UID.
- **Financial/Point Protection**: Only the RT Admin can modify points balance (`points`) or update the deposit status to `approved`/`rejected`. Residents cannot self-assign points or override deposit statuses.
- **PII Isolation**: Resident phone numbers and addresses are highly sensitive PII. No resident may read another resident's profile. Admin can view profiles for database and compliance tracking.
- **Terminal State Lock**: Once a reward claim or deposit status reaches a terminal state (`status: 'completed'`, `status: 'approved'`, or `status: 'rejected'`), it can never be updated again (except by an Admin override if needed).

## 2. The "Dirty Dozen" Malicious Payloads (Threat Vectors)
We test these 12 distinct attack vectors against the security rules to ensure they are blocked.

1. **Identity Escalation**: Citizen tries to create/update their profile with `role: "admin"`.
2. **PII Data Leakage**: Authenticated resident `u1` tries to read the profile/PII of resident `u2`.
3. **Ghost Fields injection**: Citizen attempts to update deposit adding custom verified properties (e.g., `isVerified: true`).
4. **Point Spoofing**: Citizen attempts to increase their own `points` or `totalTrashWeight` directly.
5. **Deposit Override**: Citizen tries to modify an approved/rejected deposit status back to `pending` or edit notes.
6. **Fake Deposit Association**: Citizen `u1` tries to submit a deposit with `userId` set to `u2`'s ID.
7. **Negative Weight Exploit**: Citizen tries to submit a deposit with a negative weight (e.g. `-10kg`) to manipulate systems.
8. **Claim Spoofing**: Citizen tries to claim a reward without sufficient points, or tries to self-approve/complete a claim (`status: "completed"`).
9. **Schedule Manipulation**: Non-admin user tries to write/edit the garbage pickup schedules.
10. **Marketplace Price Modification**: Non-admin user tries to edit a reward item's cost to `0` points.
11. **Notification Spoofing**: Resident `u1` tries to write to notification collection for `u2` to send fake points messages.
12. **Blanket Query Scraping**: Resident attempts to list all user profiles or all trash deposits without filtering by their own ID.

## 3. Security Assertions
Every Firestore operation is subjected to strict rule guards:
- `allow read, write: if false;` catch-all default-deny.
- Admin rules look up the specific role in the trusted `/users/$(request.auth.uid)` document.
- Operations that mutate state must have an explicit validation helper (e.g. `isValidUser()`, `isValidDeposit()`).
