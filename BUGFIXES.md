# Whiz POS Multi-Outlet v8 - Issue Report

---

## Major Problems Observed (As of 2026-06-01)

### 1. **Sync Is Not Working at All**
- **Initial Sync Works**: When an outlet is first approved, it gets the initial data (products, business setup, etc.) correctly.
- **Subsequent Syncs Fail**:
  - ✅ No sales from the outlet are synced to the server.
  - ✅ No expenses from the outlet are synced to the server.
  - ✅ No credit customers added on the outlet are synced to the server.
  - ✅ No changes made on the server (product updates, stock changes, new customers/expenses) are synced to the outlet.
  - ✅ Outlet status often shows as "Offline" even when it's actively running and connected.

---

### 2. **Specific Broken Sync Scenarios**
- **Scenario A - Server → Outlet Sync Failure**:
  1. Go to server, open "Outlets Management", select an outlet.
  2. Edit product stock (add/remove quantity), save changes.
  3. Check the outlet: stock remains unchanged, no update received.
  4. Add a new customer on the server.
  5. Check the outlet: new customer never appears.

- **Scenario B - Outlet → Server Sync Failure**:
  1. Go to outlet and make a sale (cart exists, sale completes successfully locally).
  2. Check server's sales list: no new sale appears.
  3. Add an expense on the outlet.
  4. Check server's expenses list: no new expense appears.

---

### 3. **Electron Cache/Permission Errors**
- Console shows errors on app startup in both dev and production:
  ```
  [ERROR:cache_util_win.cc(20)] Unable to move the cache: Access is denied. (0x5)
  [ERROR:disk_cache.cc(208)] Unable to create cache
  [ERROR:gpu_disk_cache.cc(711)] Gpu Cache Creation failed: -2
  ```
- Attempted some quick fixes (disabled GPU cache, set temp dir), but unsure if they fully resolve the issue long-term.

---

### 4. **Codebase History**
Previous attempts to fix included:
- Added endpoints in `electron.cjs` for `/api/outlet-sync/:outletId/expenses`, `/api/outlet-sync/:outletId/credit-customers`, `/api/outlet-sync/:outletId/stock`
- Updated `posStore.ts` to add `pendingOutletExpenses`, `pendingOutletCreditCustomers`
- Tried updating sync snapshot handling in outlet
- Removed stock transfers from UI, added receipt settings to outlet
- But none of the above solved the core sync problem.

---

## What Needs Investigation

### Check These Critical Paths

1. **WebSocket (Realtime Sync)**:
   - Are WebSocket connections being established correctly between server and outlets?
   - When data changes on server, is `sync-event` or `sync-snapshot` being broadcast correctly?
   - On the outlet side, is the realtime listener actually receiving and processing sync messages?

2. **HTTP Sync (Polling/Push)**:
   - In `posStore.ts`'s `syncFromServer()` function, are the pending transactions/expenses/customers being sent correctly?
   - Is the server endpoint returning a success response?
   - Are the pending queues being cleared on success?
   - When the server updates an outlet's stock/users/products, is it triggering a broadcast to connected outlets?

3. **Outlet Connection Management**:
   - How are outlets tracked as "Online"/"Offline"? Is `lastSeen` being updated correctly when outlets ping or sync?
   - How does the server know which outlets are connected and need realtime updates?

4. **Testing Setup**:
   - Need clear steps to reproduce issues consistently.
   - Need to verify both dev mode (`npm run dev:server` + `npm run dev:outlet`) and production mode builds work.

---

## Environment
- OS: Windows
- Node Version: See `package.json` engines
- App Version: 8.0.0
