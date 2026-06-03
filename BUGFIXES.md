# Whiz POS Multi-Outlet v8 - Comprehensive Bug Report

This document lists all major bugs discovered in the system as of June 2026. These bugs are addressed in the `SYNC_LOGIC_REPAIR.md` guide.

---

## 1. Sync Failures (The Communication Gap)

- **Bi-Directional Failure**: Changes made on the Server (prices, new products) do not reach Outlets. Changes made on Outlets (sales, expenses) do not reach the Server.
- **Lost Deliveries**: The system does not have a "Got it!" (Acknowledgment) system. If a message is sent while the network is weak, it is lost forever.
- **Pending Queue Errors**: The "Pending Box" on the Outlet is sometimes cleared even if the Server didn't actually save the data.

---

## 2. Assignment Logic Errors (The "Everything" Bug)

- **Zero-Selection Failure**: When an Outlet is approved with 0 products or 0 users assigned, the system defaults to sending the *entire* database.
- **Filter Leakage**: The Server's data filter is too "polite"—it thinks an empty list means "unrestricted" instead of "nothing."
- **Identity Drift**: Outlets sometimes lose their "Name Tag" (ID), causing the Server to send them the wrong data or Main Store data.

---

## 3. Stock Management Errors (The "Backpack" Bug)

- **Warehouse Fallback**: If an Outlet doesn't have a specific stock count for an item, it incorrectly looks at the Server's Main Warehouse count.
- **Incorrect Deductions**: Sales at the Outlet sometimes subtract from the Main Store's total instead of the Outlet's own private stock.
- **Stock Duplication**: Transferred stock is sometimes counted twice (once in the store and once in the outlet) or disappears entirely during sync.

---

## 4. Connectivity & Status Errors (The "Napping" Bug)

- **False Offline Status**: Outlets are often marked as "Offline" even while they are successfully performing sales locally.
- **Stale Heartbeats**: The "Wave" (Ping) between Server and Outlet is inconsistent. The Server's record of when it last saw an Outlet is not updated frequently enough.
- **Discovery Failures**: The "Automatic Discovery" (mDNS) sometimes fails to find the Server on complex networks, leaving the Outlet stranded.

---

## 5. System & Environment Errors (The "Locked Box" Bug)

- **Permission Denied (0x5)**: The app tries to save database and cache files in protected Windows folders (like `C:\ProgramData`), causing crashes.
- **GPU Cache Conflicts**: The graphics processor tries to create hidden files in locked directories, leading to startup errors.
- **Access Denied on Restart**: When the app tries to update or restart, it cannot move its own files because they are still "locked" by the previous session.

---

## Summary of Impact
These bugs combined create a situation where Outlets operate as independent silos with incorrect stock data, and the Main Server fails to act as a central hub for reporting and inventory management.
