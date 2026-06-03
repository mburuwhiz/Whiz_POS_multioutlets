# Whiz POS - Technical Repair & UI Optimization Specification

This document provides a comprehensive engineering blueprint to resolve synchronization failures, inventory latency, missing outlet reporting, and POS UI responsiveness.

---

## 1. Bidirectional Entity Sync (The "Unified Push/Pull" Logic)

### 1.1 Guaranteed Upstream Persistence (Outlet → Server)
- **Unified Entity Queue**: All entities (Transactions, Expenses, Customers, Suppliers) must be wrapped in a standard `SyncEnvelope` containing the `entityType`, `payload`, `timestamp`, and a `clientId`.
- **The Persistence Lock**: The Outlet must store these envelopes in a local "Outbox" (persisted to SQLite).
- **Atomic Push**: The Outlet attempts to flush the Outbox via a single `/api/sync/push` endpoint. The Server must process this within a database transaction and return a `processedIds` array.
- **Deletion on ACK**: The Outlet only removes items from the Outbox that appear in the `processedIds` array. This ensures that a sale made on an Outlet *must* eventually appear on the Server.

### 1.2 Multi-Entity Downstream Sync (Server → Outlet)
- **Beyond Initial Setup**: Synchronization must be a continuous process, not a one-time event.
- **Delta Syncing**: Instead of pulling the entire database, the Outlet should request "Deltas" (changes since `last_sync_timestamp`). This ensures that new Users, Expenses, and Suppliers are propagated efficiently and regularly.

---

## 2. Real-time Inventory Reactivity (Server → Outlet)

### 2.1 Push-Based Stock Updates
- **The "Stock-Push" Event**: When stock is adjusted on the Server (e.g., adding 7 units to "Tea"), the Server must immediately emit a WebSocket `inventory_update` event to all connected Outlets assigned that product.
- **Immediate State Hydration**: Upon receiving this event, the Outlet must update its local Zustand store (`products`) and SQLite database immediately. This transforms the POS UI from a "static page" into a "live reactive dashboard," changing "Out of Stock" to "Available" in milliseconds without a page refresh.

---

## 3. Outlet Reporting & Operational Autonomy

### 3.1 Local Reporting Engine
- **End-of-Day Module**: Implement a dedicated `ClosingPage` on the Outlet.
- **Calculated Summaries**: This page must calculate totals for Cash, M-Pesa, and Credit sales directly from the local SQLite transaction table for the current shift.
- **Z-Report Entity**: When the cashier clicks "Close Day," the Outlet generates a `ClosingReport` entity. This entity is stored in the "Outbox" and synced to the Server just like a transaction, ensuring the Server has a record of the Outlet's self-reported totals.

---

## 4. POS UI Responsiveness & UX Performance

### 4.1 Reactive UI Architecture
- **Optimistic UI Updates**: When an item is added to the cart, the UI must reflect the change *instantly* before any background persistence occurs.
- **Component Memoization**: Use `React.memo` and `useMemo` on the Product Grid and Cart Items to prevent unnecessary re-renders of the entire page when a single quantity changes.
- **Virtualization**: If the inventory is large (100+ items), implement a virtualized grid to ensure that only the visible products are being rendered by the browser, drastically improving scroll and click responsiveness.
- **Non-Blocking I/O**: Ensure that all disk writes (SQLite) and network requests are handled in the background, never locking the main UI thread.

---

## 5. Environment & Permission Repair

### 5.1 Reliable Filesystem Access
- **Path Resolution**: Abandon `C:\ProgramData` fallback. Exclusively use `app.getPath('userData')` which maps to `AppData/Roaming`, where the application always has full read/write/move permissions.
- **Cache Cleanliness**: Implement a "Safety Switch" on startup that clears the GPU and Shader cache if a previous "Access Denied" error was logged, ensuring the next launch is clean.

---

## Summary of Corrected Flow

1. **Sale at Outlet**: Instantly updates UI -> Saved to local "Outbox" -> Background push to Server -> Deleted from Outbox only on Server ACK.
2. **Stock Update at Server**: Server adjusts stock -> WebSocket Push -> Outlet receives and updates UI instantly.
3. **Daily Closing**: Cashier opens Closing Page -> Totals calculated from local DB -> Report printed and synced to Server.
4. **General Data**: Users, Suppliers, and Customers are periodically pulled via Delta Sync to keep the Outlet's "Private Club" up to date.
