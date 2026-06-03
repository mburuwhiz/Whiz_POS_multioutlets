# Whiz POS Multi-Outlet v8 - Engineering Issue Report (Updated)

This report documents the critical architectural, synchronization, and UI/UX bugs identified in the system as of June 2026.

---

## 1. Upstream Data Synchronization (Outlet → Server)

### 1.1 Complete Sync Failure for Core Entities
- **Issue**: Sales (transactions), expenses, credit customers, and supplier updates generated at the Outlet are not successfully persisted to the Server's central database.
- **Current State**: The Server's sales list remains at 0 even after multiple successful transactions are completed at the Outlet.
- **Root Cause**: Lack of a robust transactional push mechanism. The `posStore.ts` `syncFromServer()` function is primarily downstream-focused and doesn't reliably flush the `pendingOutletTransactions` and other entity queues to the Server's `/api/sync` or entity-specific endpoints.

---

## 2. Downstream Inventory Propagation (Server → Outlet)

### 2.1 Latency in Stock Adjustments
- **Issue**: When an administrator adds stock to an item on the Server, the change does not reflect on the Outlet's POS page.
- **Example**: If "Tea" is out of stock (0), and 7 units are added on the Server, the Outlet remains at "Out of Stock" (0) even after the first initial sync.
- **Root Cause**: The system relies on polling or manual refreshes instead of a real-time WebSocket push for stock adjustments. The Outlet's local state is not being reactively updated when the Server's inventory state changes.

---

## 3. Outlet Functional Deficiencies

### 3.1 Missing Closing & Reporting Module
- **Issue**: The Outlet lacks a dedicated interface for "End of Day" or "Shift Closing."
- **Functional Gap**: Cashiers cannot view a summary of the day's sales or print a closing report (Z-Report) directly from the Outlet terminal. This forces a reliance on the Server for operational data that should be available locally.

---

## 4. POS UI/UX & Responsiveness

### 4.1 Interface Performance (The "Unreal" UI)
- **Issue**: The POS selling page is described as "unresponsive" and "unreal."
- **Technical Observation**: Likely caused by heavy re-renders during cart updates and unoptimized product grid rendering (especially with large inventories).
- **UX Gap**: The lack of immediate visual feedback for touch/click actions and non-blocking I/O during transaction processing leads to a sluggish user experience.

---

## 5. Global Entity Synchronization

### 5.1 Comprehensive Sync Failure
- **Issue**: Users, expenses, customers, and suppliers are not being synchronized.
- **Current State**: The system only performs a partial Server → Outlet sync during initial setup, which is itself reported as inadequate. No subsequent synchronization occurs for these global entities.

---

## 6. Environment & Electron Runtime Errors

### 6.1 Filesystem Permission Restrictions (0x5 Access Denied)
- **Issue**: The application attempts to utilize `C:\ProgramData` for `userData` and `disk-cache-dir`.
- **Impact**: GPU cache creation fails, and SQLite WAL/SHM files may be locked, leading to application crashes on Windows.
