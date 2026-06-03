# Whiz POS - Synchronization & Logic Repair Specification

This document outlines the technical logic and architectural requirements for a reliable bidirectional synchronization system between the Whiz POS Main Server and its Outlets.

---

## 1. Identity & Session Management

### 1.1 Unique Instance Identification
Every Outlet must maintain a persistent, unique UUID generated at registration. This ID must be included in the header of every HTTP request and as a metadata field in all WebSocket messages.

### 1.2 Heartbeat & Presence Detection
- **Mechanism**: Outlets must emit a heartbeat message via WebSocket every 5 seconds.
- **Server-Side Tracking**: The Server must maintain an in-memory map of active connections, updating the `lastSeen` timestamp in the database only on valid heartbeat reception.
- **Status Transition**: An Outlet should be marked "Offline" only after 3 consecutive missed heartbeats (15 seconds) to account for minor network jitter.

---

## 2. Scoped Data Synchronization (The "Private Club" Logic)

### 2.1 Mandatory Filtering
The Server must enforce strict data scoping based on the Outlet ID.
- **The "Empty set" Rule**: If an Outlet has 0 assigned products or users, the API response must return an empty array, never falling back to the global dataset.
- **Filtering Logic**: All `sync-snapshot` and `sync-event` payloads must be pre-filtered on the Server before transmission. The Outlet should never receive data it is not authorized to handle.

### 2.2 Inventory Isolation
Outlets must operate within a "Stock Silo."
- **Stock Resolution**: The `resolveOutletProductStock` logic must be restricted. If a product ID does not exist in the outlet's `currentStock` map, the stock level must be treated as `0`.
- **Global Fallback Removal**: Remove all fallbacks to `product.stock` (the main store's stock) within the Outlet context.

---

## 3. Reliable Messaging & Acknowledgment (The "Message Bridge")

### 3.1 Transactional Sync (Outlet → Server)
- **Local Persistence**: All upstream operations (sales, expenses, credit customers) must be saved to a local "Pending Queue" with a unique `batchId`.
- **The ACK Protocol**: The Outlet must keep items in the Pending Queue until it receives an explicit `SYNC_ACK` message from the Server for that specific `batchId`.
- **Sequential Processing**: To maintain data integrity, items should be processed in the order they were created (FIFO).

### 3.2 Targeted Broadcasts (Server → Outlet)
- **Scoped Events**: When data changes on the Server, the `sync-event` broadcast should not be global. The Server should iterate through connected clients and send the event only to Outlets whose assignments include the modified data.
- **Snapshot Resync**: If a WebSocket connection is re-established after a disconnection, the Outlet should immediately trigger a `sync_request` to get the latest state and resolve any missed events.

---

## 4. Environment & Runtime Configuration

### 4.1 Filesystem Isolation
To resolve "Access Denied (0x5)" errors on Windows:
- **userData Path**: Relocate the Electron `userData` path to the user's local AppData folder (`app.getPath('userData')`) rather than system-wide directories.
- **Cache Management**: Explicitly define the `disk-cache-dir` within a sub-folder of the user's AppData to ensure the application has full read/write/move permissions.

### 4.2 GPU & Hardware Acceleration
Maintain the following Chromium switches to prevent cache-related startup crashes:
- Disable the shader disk cache.
- Disable GPU compositing in environments with restrictive filesystem permissions.

---

## 5. Summary of System Flow

1. **Outlet Registration**: Establishes a permanent UUID and initial scoped assignments.
2. **Presence**: Continuous heartbeat keeps the connection alive and updates the "Online" status.
3. **Scoping**: All data transmitted is strictly filtered by the Outlet ID; no global fallbacks allowed.
4. **Reliability**: Upstream data is queued locally and only cleared upon receiving a verified Server Acknowledgment.
5. **Downstream**: The Server pushes targeted updates only to relevant Outlets based on their assignment maps.
