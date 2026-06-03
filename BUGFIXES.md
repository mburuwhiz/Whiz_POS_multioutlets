# Whiz POS Multi-Outlet v8 - Engineering Issue Report

This report documents the critical architectural and synchronization bugs identified in the system as of June 2026.

---

## 1. Synchronization Architecture (Bidirectional Failures)

### 1.1 Reliable Messaging & Acknowledgments
- **Issue**: The current sync mechanism lacks a robust Acknowledgment (ACK) protocol. Real-time events are broadcast via WebSockets without verifying receipt.
- **Impact**: Inconsistent state between Server and Outlets. If an Outlet is momentarily disconnected or the network drops a packet, data is permanently lost with no retry mechanism.
- **Queue Management**: The `pendingOutletTransactions`, `pendingOutletExpenses`, and `pendingOutletCreditCustomers` queues in the POS store are cleared upon a successful HTTP response, but without ensuring the Server has successfully persisted the data to the database.

### 1.2 State Inconsistency
- **Scenario A (Downstream)**: Product updates, stock adjustments, and administrative changes (new customers/expenses) made on the Server fail to propagate to connected Outlets.
- **Scenario B (Upstream)**: Transactions, expenses, and credit customers created at the Outlet do not sync back to the Server's central database.

---

## 2. Business Logic & Assignment Errors

### 2.1 Scope Inheritance Bug (The "0 Assignment" Error)
- **Issue**: The assignment logic in the Server's snapshot builder (`buildOutletSnapshot`) uses an inclusive fallback. If `assignedProductIds` or `assignedUserIds` is empty (0 items selected), the filter logic defaults to returning the entire dataset.
- **Impact**: Selecting 0 users/products during outlet approval inadvertently assigns the entire business inventory and staff list to that outlet.

### 2.2 Inventory Isolation & Stock Fallbacks
- **Issue**: `resolveOutletProductStock` includes a fallback to the main store's stock levels (`product?.stock`) if the outlet-specific stock key is missing or undefined.
- **Impact**: Outlets incorrectly display and utilize the global inventory instead of their assigned local stock, leading to massive stock discrepancies.

---

## 3. Connection & Lifecycle Management

### 3.1 Unreliable Connectivity Status
- **Issue**: The `isOnline` status and `lastSeen` timestamps are updated inconsistently. The heartbeat mechanism is prone to timeouts that mark active outlets as "Offline."
- **mDNS Instability**: Automatic discovery via Bonjour is unreliable on certain network configurations, preventing outlets from establishing the initial connection to the Server API.

---

## 4. Environment & Electron Runtime Errors

### 4.1 Filesystem Permission Restrictions (0x5 Access Denied)
- **Issue**: The application attempts to utilize `C:\ProgramData` or other system-protected directories for the Electron `userData` and `disk-cache-dir`.
- **Error**: `[ERROR:cache_util_win.cc(20)] Unable to move the cache: Access is denied. (0x5)`
- **Impact**: GPU cache creation fails, and SQLite WAL/SHM files may be locked, leading to data corruption or application crashes on startup.

---

## 5. Development History & Previous Attempts
- Recent updates to `electron.cjs` and `posStore.ts` added specialized endpoints and pending queues, but failed to resolve the core issue due to the lack of a unified, transactional sync engine and strict data scoping.
