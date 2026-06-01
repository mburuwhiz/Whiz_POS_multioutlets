# Whiz POS Multi Outlets — Version 8.0.0
# Complete Architecture & Development Blueprint

---

## Latest Status - May 26, 2026

- The app is already a working desktop multi-outlet prototype, not just a plan
- Electron shell, SQLite persistence, server/outlet mode split, PIN login, backup/restore, outlet registration, and most UI surfaces are in place
- This update fixed the main runtime issues found during inspection:
  - setup/onboarding flow bugs
  - product ID mismatches
  - scanner comparison bugs
  - outlet stock push using a hardcoded port
  - broken remote image rendering in inventory
  - stale shared typings and Electron typings
  - missing `update-business-setup` sync handling
- New clean-start command added:
  - `npm run reset`
- `npm run reset` now clears common Whiz POS dev data locations so server and outlet testing can start fresh again
- Still partial:
  - UDP discovery
  - production-grade sync/distribution services
  - deeper reporting and advanced stock workflows

## 🚀 PROGRESS UPDATE — May 26, 2026

### ✅ **COMPLETED TASKS SO FAR:**

#### **1. Development Mode System**
- Interactive React mode selector (Server/Outlet)
- Auto-loads last used mode from localStorage
- Direct launch commands (`dev:server`, `dev:outlet`)
- Environment variable support (`WHIZ_POS_MODE`, `WHIZ_POS_PORT`, `WHIZ_POS_DB_NAME`)

#### **2. Server UI (Complete)**
- `ServerLayout.tsx` — Sidebar navigation with all server pages, logout functionality that resets server login state, user name from currentCashier
- `ServerDashboard.tsx` — Real-time stats, outlet approval, communication panel
- **Products Page** — Display, add/edit products, uses cart.png as default image
- **Categories Page (NEW)** — Manage product categories (add/delete) from server console
- **Users Page** — Display, add/edit users, role management
- **Stock Management Page** — 3-layer stock system, store stock overview
- **Outlets Page (NEW)** — Complete outlets management interface with:
  - Left: Outlet list with search, filter, add button
  - Right: Outlet details, approve/reject for pending outlets
- **Sales Page (NEW)** — Complete sales overview interface with:
  - Left: Transactions list with search, date filter
  - Right: Transaction details (items, payment, totals)
  - Stats overview (total sales, transactions count, average sale)
- **Reports Page (NEW)** — Reports & analytics UI placeholder
- **Settings Page** — Business profile, tax, receipt, backup settings (uses posStore)
- **Add/Edit Product Modal** — Complete product form, integrates with posStore, uses categories dropdown from store
- **Add/Edit User Modal** — Complete user form, PIN field, role selection
- **Server Login** — PIN-based login (uses same modern LoginScreen.tsx as outlet!)

#### **3. Outlet UI (Complete)**
- `OutletLayout.tsx` — Wrapper for outlet UI, includes LoginScreen flow (only shows main UI if logged in), logout button calls posStore.logout(), all nav items working
- `OutletDashboard.tsx` — Checkout terminal dashboard, quick actions, recent transactions
- **POS Screen (NEW)** — Complete POS checkout interface with:
  - Left: Product grid with search and category filters
  - Right: Cart sidebar with quantity controls
  - Checkout button that opens CheckoutModal
  - Integrates with posStore cart, products, categories
  - Uses cart.png as default product image
- **Orders Page (NEW)** — Complete orders history interface with:
  - Left: Orders list with search
  - Right: Order details panel (items, payment, totals)
- **Customers Page (NEW)** — Complete customers management interface with:
  - Left: Customer list with search and add button
  - Right: Customer details (contact, credit, purchase summary)
- **Inventory Page (NEW)** — Complete inventory lookup interface with:
  - Left: Product list with search, category filter, sort
  - Right: Product details (price, stock, description)
  - Uses cart.png as default product image
- **X-Report Page (NEW)** — Mid-shift report UI placeholder
- **Z-Report Page (NEW)** — Daily closing report UI placeholder
- **Settings Page (NEW)** — Outlet settings UI placeholder
- **Server Communication Panel** — Ping server, message log
- Stats overview (today's sales, products, active users, shift time)

#### **4. Core Services (Created)**
- `BackupMigrationService.ts` — Legacy backup import, schema migration
- `UDPDiscoveryService.ts` — Server broadcast, outlet discovery
- `SyncEngineService.ts` — Offline queue, sync status, retry mechanism
- `StockDistributionService.ts` — Stock locations, transfers, history
- `ServerOutletCommunicationService.ts` — Mock server-outlet messaging for testing

#### **5. PIN Logic (Existing & Enhanced)**
- Server/Outlet PIN-based authentication already exists in posStore
- PIN field in Add/Edit User Modal
- PIN field in Login flow (existing code)
- Role-based access controls
- Logout functionality properly resets currentCashier, businessSetup.isLoggedIn, and sessionToken
- **Bug Fix**: finishSetup now saves users.json and adds admin user to store.users array (fixed "invalid PIN" issue!)
- **Modern Login Screen**: Both Server and Outlet use same LoginScreen.tsx (touchscreen optimized, 4-digit PIN, touch keypad + keyboard support!)
- **Product Modal**: Now uses categories dropdown from store instead of free text

---

## Table of Contents
1. [Full System Architecture](#1-full-system-architecture)
2. [Folder Structure Plan](#2-folder-structure-plan)
3. [Database Redesign Plan](#3-database-redesign-plan)
4. [Backup Migration Plan](#4-backup-migration-plan)
5. [UDP Discovery Architecture](#5-udp-discovery-architecture)
6. [Sync Engine Architecture](#6-sync-engine-architecture)
7. [Outlet Approval Architecture](#7-outlet-approval-architecture)
8. [Stock Management Architecture](#8-stock-management-architecture)
9. [Stock Transfer Logic](#9-stock-transfer-logic)
10. [UI/UX Redesign Strategy](#10-uiux-redesign-strategy)
11. [Development Mode System](#11-development-mode-system)
12. [Server Requirements](#12-server-requirements)
13. [Server Login System](#13-server-login-system)
14. [Outlet Setup Flow](#14-outlet-setup-flow)
15. [Outlet Approval System](#15-outlet-approval-system)
16. [Approval Wizard](#16-approval-wizard)
17. [Outlet Requirements](#17-outlet-requirements)
18. [Receipt System Improvements](#18-receipt-system-improvements)
19. [Reporting & Analytics](#19-reporting--analytics)
20. [Data Safety Requirements](#20-data-safety-requirements)
21. [Persistence Requirements](#21-persistence-requirements)
22. [Technology & Design Requirements](#22-technology--design-requirements)

---

## 1. Full System Architecture

### Server Architecture (Main Server)
- **Role**: Master Control Center
- **Port**: 3000
- **Database**: instance-server.db (SQLite)
- **Responsibilities**:
  - Centralized product management
  - User & permissions management
  - Outlet management & approval
  - Stock distribution & transfers
  - Global reporting & analytics
  - Backup & migration
  - UDP server discovery

### Outlet Architecture (Checkout Outlet)
- **Role**: POS Sales Terminal
- **Port**: 3001+
- **Database**: instance-outlet.db (SQLite)
- **Responsibilities**:
  - POS sales & checkout
  - Local receipt printing
  - Offline operation support
  - Sync with main server
  - Local UI for cashiers

### Networking Architecture
- **Protocol**: HTTP/REST API + WebSockets (for real-time updates)
- **Discovery**: UDP Broadcast (LAN)
- **Fallback**: Manual IP/Hostname entry

### Sync Architecture
- **Direction**: Bidirectional (Server ↔ Outlet)
- **Queue**: Persistent offline sync queue
- **Conflict Resolution**: Last-Write-Wins (LWW) with server authority
- **Retry**: Exponential backoff

### Database Architecture
- **Server DB**: Tables for outlets, sync metadata, stock movements, audit logs
- **Outlet DB**: Local copy of assigned products/users, local transactions, sync queue

### Offline Architecture
- **Outlet Operation**: Full POS functionality without network
- **Queue**: All changes stored locally in sync queue
- **Sync On Reconnect**: Queue processed automatically when online

### Backup Architecture
- **Legacy Import**: Migration engine for .wpos files (v7 and earlier)
- **New Backups**: .wpos8 format with multi-outlet data
- **Incremental**: Optional incremental backups

---

## 2. Folder Structure Plan

```
whiz_pos_multi_ouletv8/
├── src/
│   ├── shared/                    # Shared modules (Server & Outlet)
│   │   ├── components/            # Reusable UI components
│   │   │   ├── ui/                # ShadCN-style components
│   │   │   └── ...
│   │   ├── lib/                   # Utilities, types, constants
│   │   │   ├── types.ts           # Shared TypeScript types
│   │   │   ├── constants.ts
│   │   │   └── utils.ts
│   │   ├── services/              # Shared business logic
│   │   │   ├── db-service.ts      # Database wrapper
│   │   │   └── ...
│   │   └── store/                 # Zustand store (shared)
│   │
│   ├── server/                    # Server-only modules
│   │   ├── components/            # Server UI components
│   │   ├── pages/                 # Server pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── OutletsPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── StockTransfersPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/              # Server services
│   │   │   ├── udp-discovery.ts
│   │   │   ├── sync-service.ts
│   │   │   ├── outlet-approval.ts
│   │   │   └── migration-engine.ts
│   │   ├── api/                   # Server API routes (Express)
│   │   │   ├── outlets.ts
│   │   │   ├── products.ts
│   │   │   ├── users.ts
│   │   │   ├── sync.ts
│   │   │   └── ...
│   │   └── store/                 # Server Zustand store
│   │
│   ├── outlet/                    # Outlet-only modules
│   │   ├── components/            # Outlet UI components
│   │   ├── pages/                 # Outlet pages
│   │   │   ├── POSPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/              # Outlet services
│   │   │   ├── udp-client.ts
│   │   │   ├── sync-client.ts
│   │   │   └── pos-service.ts
│   │   └── store/                 # Outlet Zustand store
│   │
│   ├── App.tsx                    # Entry point (mode selector)
│   ├── main.tsx                   # React bootstrap
│   └── index.css                  # Global styles (Tailwind)
│
├── electron/                      # Electron main process
│   ├── main.cjs                   # Electron entry
│   ├── preload.cjs                # Preload script
│   ├── db/                        # Database setup
│   │   ├── server-db.cjs
│   │   └── outlet-db.cjs
│   └── services/
│       ├── udp-service.cjs
│       └── ...
│
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── ...
```

---

## 3. Database Redesign Plan

### New Tables (Server DB)

#### outlets
```sql
CREATE TABLE outlets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, disconnected
    ip_address TEXT,
    port INTEGER,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    data TEXT -- JSON: outlet-specific config
);
```

#### outlet_products
```sql
CREATE TABLE outlet_products (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
);
```

#### outlet_users
```sql
CREATE TABLE outlet_users (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
);
```

#### stock_movements
```sql
CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- transfer_in, transfer_out, sale, adjustment
    product_id TEXT NOT NULL,
    from_location TEXT, -- 'store' or outlet_id
    to_location TEXT, -- 'store' or outlet_id
    quantity INTEGER NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);
```

#### store_stock
```sql
CREATE TABLE store_stock (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### outlet_stock
```sql
CREATE TABLE outlet_stock (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(outlet_id, product_id)
);
```

#### sync_metadata
```sql
CREATE TABLE sync_metadata (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- product, user, transaction, etc.
    entity_id TEXT NOT NULL,
    outlet_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending', -- pending, synced, failed
    last_attempt DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT -- JSON payload
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    user_id TEXT,
    outlet_id TEXT,
    details TEXT, -- JSON
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Backup Migration Plan

### Legacy Schema Detection
- Detect file extension: `.wpos`
- Parse JSON structure to identify v7 schema
- Validate backup integrity (check for required tables)

### Migration Mapping

| Legacy Data | Version 8.0.0 Location | Notes |
|-------------|------------------------|-------|
| businessSetup | businessSetup (server) | Main server business profile |
| products | products (server) + store_stock | Global products; stock goes to store_stock |
| users | users (server) | Shared users |
| transactions | transactions (server) | Centralized sales history |
| creditCustomers | creditCustomers (server) | Global customers |
| suppliers | suppliers (server) | Global suppliers |
| expenses | expenses (server) | Global expenses |

### Stock Conversion Logic
1. All imported product quantities → `store_stock.quantity`
2. Outlet stock initialized to 0
3. Example:
   - Legacy: Coca Cola = 120 pcs
   - After migration:
     - store_stock: Coca Cola = 120
     - All outlets: Coca Cola = 0

### User & Role Migration
- Preserve all users, PINs, roles, permissions
- Map legacy roles to new permission architecture
- Mark migrated users as "server users"

### Validation Logic
- Check for missing required fields
- Validate data types
- Check for duplicate IDs
- Generate migration log

### Migration Log
```typescript
interface MigrationLog {
    timestamp: Date;
    status: 'success' | 'failed' | 'partial';
    steps: {
        name: string;
        status: 'success' | 'failed';
        recordsProcessed: number;
        error?: string;
    }[];
    rollbackAvailable: boolean;
}
```

---

## 5. UDP Discovery Architecture

### Broadcast Protocol
- **Port**: 41234 (UDP)
- **Broadcast Interval**: Every 5 seconds
- **Server Announcement Structure**:
```json
{
    "type": "whizpos_server_announcement",
    "version": "8.0.0",
    "serverId": "uuid-v4",
    "serverName": "Main Server",
    "ipAddress": "192.168.1.100",
    "port": 3000,
    "apiEndpoint": "/api",
    "status": "online"
}
```

### Outlet Discovery Flow
1. Outlet starts UDP client, listens for broadcasts
2. Collects server announcements for 3 seconds
3. Shows list of available servers to user
4. User selects server (or enters IP manually)
5. Outlet sends connection request to server

### Fallback Connection Methods
- Manual IP/Hostname entry
- Manual Port entry
- Saved previous connections

### Network Timeout Handling
- Server announcement timeout: 15 seconds
- Connection request timeout: 10 seconds
- Retry logic with exponential backoff

---

## 6. Sync Engine Architecture

### Real-time Sync Flow
1. **Change Capture**: Any change on server/outlet creates sync record
2. **Queue Management**: Records added to sync queue
3. **Transmission**: Records sent to peer when online
4. **Acknowledgement**: Peer confirms receipt
5. **Cleanup**: Synced records removed from queue

### Offline Sync Queue
- Persistent SQLite table (`sync_metadata`)
- Records survive crashes/restarts
- Processed in FIFO order

### Conflict Handling
- **Server Authority**: Server wins conflicts
- **Last-Write-Wins (LWW)**: Timestamp-based resolution
- **Audit Log**: All conflicts logged for review

### Retry Handling
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max 32s)
- Max retries: 10
- Failed records marked with error message

### Crash Recovery
- On startup, check sync queue for pending records
- Resume processing from last successful sync
- Verify data integrity with server

---

## 7. Outlet Approval Architecture

### Approval Requests
- Outlet sends request: `POST /api/outlets/request`
- Payload:
```json
{
    "outletId": "uuid-v4",
    "name": "Outlet A",
    "ipAddress": "192.168.1.101",
    "port": 3001
}
```

### Outlet Registration
- Server creates outlet record with `status: 'pending'`
- Shows in Pending Requests page

### Product Assignment
- Server admin selects which products are available to outlet
- Stored in `outlet_products` table

### User Assignment
- Server admin selects which users can access outlet
- Stored in `outlet_users` table

### Initial Stock Assignment
- Server admin sets initial outlet stock quantities
- Creates `stock_movements` record
- Updates `outlet_stock` table

### Persistent Outlet Linking
- Outlet stores server connection details locally
- Survives restarts/crashes
- Auto-reconnects on startup

---

## 8. Stock Management Architecture

### Three Stock Layers

#### A. Store Stock (Central Warehouse)
- Table: `store_stock`
- Owned by: Main Server
- Purpose: Central inventory pool
- Operations: Receive stock, transfer to outlets, adjustments

#### B. Outlet Stock (Physical Outlet Inventory)
- Table: `outlet_stock`
- Owned by: Individual Outlet
- Purpose: Local inventory for POS sales
- Operations: Sell items, receive transfers from store, returns

#### C. Total Business Stock
- Calculated as: `store_stock + SUM(outlet_stock for all outlets)`
- Displayed in server dashboard
- Not stored, calculated on demand

---

## 9. Stock Transfer Logic

### Transfer Example
**Scenario**: Move 1 item from Store → Outlet B

**Steps**:
1. Server creates `stock_movements` record:
   - type: 'transfer_out'
   - from_location: 'store'
   - to_location: 'outlet-b-id'
   - quantity: 1
2. Decrement `store_stock.quantity` by 1
3. Server sends sync to Outlet B
4. Outlet B creates local `stock_movements` record
5. Outlet B increments `outlet_stock.quantity` by 1

**Result**:
- Store Stock: -1
- Outlet B Stock: +1
- Total Business Stock: unchanged

### Reconciliation Logic
- Periodic stock checks (daily/weekly)
- Compare physical count vs system count
- Create adjustment stock movements for variances

### Adjustment Logic
- Direct stock modifications (for errors, damages, etc.)
- Requires manager/admin permission
- Logged in `stock_movements` with type 'adjustment'

### Movement History
- Full audit trail of all stock changes
- Filterable by product, date, location, type
- Exportable to CSV/PDF

---

## 10. UI/UX Redesign Strategy

### Design Principles
- **Enterprise-grade**: Professional, clean, modern
- **Responsive**: Works on all screen sizes
- **Dark/Light Themes**: Toggle support
- **Animations**: Smooth transitions where appropriate

### UI Components
- **Cards**: Modern, with shadows, rounded corners
- **Typography**: Clear hierarchy (H1, H2, H3, body, small)
- **Buttons**: Primary, secondary, danger variants
- **Tables**: Sortable, filterable, pagination
- **Modals**: Clean, centered, accessible
- **Charts**: Beautiful, interactive (Chart.js)

### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Logo, User Menu, Theme Toggle)  │
├──────────────────┬──────────────────────┤
│ Navigation       │ Main Content Area    │
│ (Sidebar)        │                      │
│                  │ ┌──────────────────┐ │
│                  │ │ Page Content     │ │
│                  │ └──────────────────┘ │
└──────────────────┴──────────────────────┘
```

### No Old UI Reuse
- All UI components redesigned from scratch
- No direct copy-paste from v7 UI
- Fresh, modern look and feel

---

## 11. Development Mode System

### Launch Prompt
When running `npm run dev`:
```
=== Whiz POS Development Mode ===

Select the instance type you want to run for local testing.

? Which mode do you want to launch?
  > 🖥️ Main Server (Port 3000, instance-server DB)
    📱 Checkout Outlet (Port 3001, instance-outlet DB)
    ❌ Cancel
```

### Requirements
- Separate databases: `instance-server.db` and `instance-outlet.db`
- Separate ports: 3000 (server), 3001 (outlet)
- Shared networking (UDP discovery works locally)
- Support for running both simultaneously in separate terminals

---

## 12. Server Requirements

### Server as Master Control Center
Controls:
- ✅ Products (global product catalog)
- ✅ Users & Permissions (shared user system)
- ✅ Outlets (management & approval)
- ✅ Reports (global analytics)
- ✅ Stock (store stock & transfers)
- ✅ Sales Overview (all outlets combined)

### Server UI Pages
1. Dashboard (Overview)
2. Outlets Management
3. Products Management
4. Users & Permissions
5. Stock Transfers
6. Reports & Analytics
7. Settings

---

## 13. Server Login System

### Requirements
- **Authentication**: PIN-based (same as v7 for familiarity)
- **Access Control**: Managers/Admins only
- **Cashier Restriction**: Cashiers denied server access
- **Permission Enforcement**: Role-based access control (RBAC)

### Login Flow
1. User enters PIN
2. System verifies PIN and role
3. If Admin/Manager → grant access
4. If Cashier → show error: "Access denied. Server access requires Manager or Admin privileges."

---

## 14. Outlet Setup Flow

### Step 1: Select Outlet Mode
- On first launch, user selects "Checkout Outlet"
- Or "Main Server" if setting up server

### Step 2: Discover/Select Server
- Outlet scans LAN via UDP for servers
- Shows list of available servers
- User selects server or enters IP manually

### Step 3: Request Connection
- Outlet sends connection request to server
- Shows "Waiting for approval..." message

### Step 4: Wait for Approval
- Server admin approves/denies request
- Outlet polls server for status
- On approval: completes setup and syncs initial data

---

## 15. Outlet Approval System

### Pending Requests Page (Server)
- Table showing all pending outlet requests
- Columns: Outlet Name, IP Address, Request Date, Status
- Actions: Approve, Reject, View Details

### Approval Controls
- **Approve**: Opens Approval Wizard
- **Reject**: Requires rejection reason, sends to outlet
- **Duplicate Detection**: Checks for existing outlet with same name/IP

### Sync Status
- Shows last sync time for each outlet
- Shows connection status (Online/Offline)
- Shows last seen timestamp

---

## 16. Approval Wizard (Server)

### Step 1: Assign Products
- Select which products are available to this outlet
- Checkbox list of all products
- "Select All" / "Deselect All" buttons
- Search/filter products

### Step 2: Assign Users
- Select which users can access this outlet
- Checkbox list of all users
- "Select All" / "Deselect All" buttons
- Filter by role

### Step 3: Initialize Outlet Stock
- Set initial stock quantities for each product
- Defaults to 0
- Option to copy from store stock (or percentage)
- Bulk set quantities

### Final: Confirm & Approve
- Summary of selections
- "Confirm Approval" button
- Creates all necessary records
- Sends approval to outlet

---

## 17. Outlet Requirements

### Outlet Performs
- ✅ POS sales & checkout
- ✅ Receipt printing
- ✅ Local UI for cashiers
- ✅ Offline operations
- ✅ Sync with server

### Outlet Controlled By Server
- ✅ Products: Assigned by server
- ✅ Users: Assigned by server
- ✅ Stock: Transferred from server
- ✅ Settings: Synced from server
- ✅ Sync: Managed by server

### Outlet Does Not Perform
- ❌ Full business setup (uses server setup)
- ❌ Product creation/editing (read-only)
- ❌ User management (read-only)
- ❌ Global reports (local only)

---

## 18. Receipt System Improvements

### Duplicate Receipt Printing
- **Modes**:
  - Single copy (default)
  - Customer + Cashier copies

### Print Settings
- Option to select receipt mode in Settings
- Option to auto-print both copies on sale
- Manual reprint with copy selection

---

## 19. Reporting & Analytics (Server)

### Global Sales Overview
- Total sales across all outlets
- Sales by outlet
- Sales trend charts (daily/weekly/monthly)

### Outlet Summaries
- Individual outlet performance
- Comparison between outlets

### Cashier Performance
- Sales per cashier
- Transaction count per cashier
- Average sale per cashier

### Revenue Analytics
- Revenue by product
- Revenue by category
- Revenue by payment method

### Stock Analytics
- Low stock alerts (store + outlets)
- Fast moving items
- Slow moving items
- Stock value reports

### Outlet Performance Dashboards
- Per-outlet dashboards
- Key metrics per outlet
- Quick actions (view details, contact, etc.)

---

## 20. Data Safety Requirements

### System Must Survive
- ✅ Crashes
- ✅ Restarts
- ✅ Power outages
- ✅ Network failures
- ✅ Offline periods

### No Data Loss Tolerated
- All transactions written to disk immediately
- WAL mode enabled for SQLite
- Sync queue persistent
- Regular auto-backups

---

## 21. Persistence Requirements

### Outlet Linking Persists Across
- ✅ Restarts
- ✅ Offline periods
- ✅ App crashes

### No Accidental Unlinking
- Outlet stores server connection details locally
- Requires explicit action to unlink
- Auto-reconnects on startup

---

## 22. Technology & Design Requirements

### Preferred Stack
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- Electron (desktop app)
- SQLite + better-sqlite3 (database)
- Express (API server)
- Chart.js (charts)
- Framer Motion (animations)
- Lucide React (icons)

### UI Should Feel
- ✅ Fast
- ✅ Premium
- ✅ Enterprise-grade
- ✅ Commercial-quality

---

## 23. Server Pages (Master Control Center) — Detailed Breakdown

### 1. Dashboard (Enhanced)
- **Real-time Metrics**: Live sales counter, active outlets, low stock alerts
- **Outlet Health Grid**: Status (Online/Offline), last sync, last sale for each outlet
- **Quick Actions**: Add product, create transfer, approve outlet
- **Charts**:
  - Sales by outlet (bar chart)
  - Top 10 products (pie chart)
  - Hourly sales trend (line chart)
- **Recent Activity Feed**: All key actions (sales, transfers, user logins)
- **Todo List**: Manager tasks (e.g., "Approve Outlet B", "Restock Coca Cola")

---

### 2. Outlets Management
#### Subpages:
- **All Outlets**:
  - Table with: Name, Status, IP, Last Seen, Last Sync, Sales Today
  - Filters: Status (Online/Offline/Pending), Search by name
  - Bulk Actions: Restart sync, Send notification
- **Pending Approvals**:
  - Approval wizard (3 steps: Assign Products → Assign Users → Initialize Stock)
  - Reject with reason
- **Outlet Details**:
  - Outlet profile, assigned products/users, stock levels, sales history, sync logs
  - Remote actions: Refresh data, Reset outlet (factory reset)

---

### 3. Products Management
#### Subpages:
- **All Products**:
  - Grid/list view, filters (category, stock status, price range)
  - Bulk actions: Edit category, update price, assign to outlets
- **Add/Edit Product**:
  - Product variants (e.g., "Coca Cola - 300ml", "Coca Cola - 500ml")
  - Product bundles (e.g., "Meal Deal: Burger + Fries + Soda")
  - Barcode management (multiple barcodes per product)
  - Images (multiple images, gallery view)
  - Min/max stock levels, reorder points
- **Product Categories**:
  - Hierarchical categories (nesting support)
  - Drag-and-drop reorder
- **Import/Export**:
  - CSV import (products, categories, stock)
  - Export to CSV/XLSX

---

### 4. Users & Permissions
#### Subpages:
- **All Users**:
  - Table with: Name, Role, Status, Last Login, Assigned Outlets
  - Filters: Role, Status, Search
- **Add/Edit User**:
  - PIN/Password login
  - Role assignment (Admin, Manager, Cashier, Custom)
  - Granular permission settings (e.g., "Can void transactions", "Can manage stock")
  - Permission templates (save/load permission sets)
  - Assigned outlets
- **Roles Management**:
  - Create custom roles
  - Edit default role permissions
- **Audit Logs for Users**:
  - Login/logout history, actions performed

---

### 5. Stock Management
#### Subpages:
- **Store Stock**:
  - Current store stock levels
  - Quick stock adjustment (add/remove)
  - Stock valuation (total value of store stock)
- **Outlet Stock Overview**:
  - Aggregated view of stock across all outlets
  - Filter by outlet or product
- **Stock Reconciliation**:
  - Physical count vs system count
  - Reconciliation wizard, variance reports
- **Stock Movement History**:
  - Full audit trail (transfers, sales, adjustments)
  - Filters: Date, Product, Location, Type

---

### 6. Stock Transfers
#### Subpages:
- **New Transfer**:
  - Create transfer from Store → Outlet or Outlet → Store
  - Add multiple products, set quantities
  - Add notes, reference number
- **Pending Transfers**:
  - Transfers waiting to be received
  - Cancel pending transfers
- **Transfer History**:
  - All completed transfers, filter by date/outlet
  - View transfer details, print transfer slip
- **Receive Transfer**:
  - Receive items at destination, confirm quantities
  - Auto-update stock levels

---

### 7. Sales Overview
#### Subpages:
- **All Sales**:
  - Table with: Transaction ID, Date, Outlet, Cashier, Total, Payment Method
  - Filters: Date range, Outlet, Cashier, Payment Method, Status
  - Search by Transaction ID or Customer Name
  - Bulk actions: Export, Reprint receipts
- **Sales by Outlet**:
  - Compare sales performance across outlets
  - Charts: Sales per outlet, AOV per outlet
- **Sales by Cashier**:
  - Cashier performance: Sales count, total sales, average sale
- **Sales Trends**:
  - Daily/weekly/monthly/yearly sales trends
  - Same-period comparison (e.g., this month vs last month)

---

### 8. Reports & Analytics (Enhanced)
#### Subpages:
- **Sales Reports**:
  - Daily Closing Report
  - Weekly Summary
  - Monthly Summary
  - Yearly Summary
  - Tax Report
- **Inventory Reports**:
  - Stock Status Report (In Stock/Low Stock/Out of Stock)
  - Inventory Valuation Report
  - Fast Moving Items
  - Slow Moving Items
  - Stock Movement Report
- **Customer Reports**:
  - Top Customers
  - Customer Loyalty Report
  - Credit Customer Report
- **Employee Reports**:
  - Cashier Performance Report
  - Login/Logout Report
- **Custom Dashboards**:
  - Build custom dashboards with drag-and-drop widgets
  - Save/load dashboards
- **Exports**:
  - All reports exportable to PDF, CSV, XLSX

---

### 9. Customers Management
#### Subpages:
- **All Customers**:
  - Table with: Name, Phone, Email, Balance, Total Spent, Last Visit
  - Filters: Loyalty Tier, Balance, Search
- **Add/Edit Customer**:
  - Contact details, loyalty info, credit balance
  - Customer notes, tags (e.g., "VIP", "Regular")
- **Customer Segments**:
  - Create customer segments (e.g., "VIP", "New Customers")
  - Send targeted promotions (future feature)
- **Loyalty Program**:
  - Loyalty tiers (Bronze/Silver/Gold/Platinum)
  - Points earning rules (e.g., 1 point per KES 10 spent)
  - Reward catalog (redeem points for discounts/products)

---

### 10. Suppliers Management
#### Subpages:
- **All Suppliers**:
  - Table with: Name, Contact, Location, Active, Last Order
  - Filters: Active, Search
- **Add/Edit Supplier**:
  - Contact details, location, notes
- **Purchase Orders**:
  - Create purchase orders from suppliers
  - Receive items into store stock
  - Purchase order history
- **Supplier Performance**:
  - Delivery times, order accuracy, price comparison

---

### 11. Expenses Management
#### Subpages:
- **All Expenses**:
  - Table with: Date, Description, Category, Amount, Cashier, Outlet
  - Filters: Date range, Category, Outlet, Cashier
- **Add/Edit Expense**:
  - Category, amount, description, receipt attachment
- **Expense Categories**:
  - Manage expense categories (e.g., "Rent", "Utilities", "Salaries")
- **Expense Approval Workflow**:
  - Require manager approval for expenses over a threshold
- **Expense Reports**:
  - Expense summary, expenses by category, expenses by outlet

---

### 12. Audit Logs
- **Full Audit Trail**:
  - All actions: Who, What, When, Where
  - Filters: Date range, User, Action Type, Entity Type
- **Log Details**:
  - View full details of each log entry
  - Export logs to CSV/XLSX

---

### 13. Settings (Enhanced)
#### Subpages:
- **Business Profile**:
  - Business name, address, phone, email, logo
- **Tax & Currency**:
  - Tax rate(s), currency, currency symbol
  - Multiple tax rates (e.g., VAT, Service Tax)
- **Receipt Settings**:
  - Receipt header/footer, logo on receipt, show tax, show cashier
  - Duplicate receipt mode (Single/Customer+Cashier)
- **Printer Settings**:
  - Default printer, paper width, test print
- **Backup & Restore**:
  - Create backup, restore from backup, backup schedule
  - Legacy backup import (.wpos files)
- **Theme Settings**:
  - Dark/Light theme, custom color scheme
- **API Settings**:
  - API keys, webhooks
- **Notifications**:
  - Low stock alerts, daily summary email, outlet offline alerts

---

## 24. Outlet Pages (POS Terminal) — Detailed Breakdown

### 1. POS (Point of Sale) — Enhanced
- **Product Grid**:
  - Category tabs, search bar, quick access buttons
  - Product images, prices, stock indicators
  - Favorite products (pin frequently sold items)
- **Cart**:
  - Item list, quantities, modifiers (e.g., "Extra sauce", "No onions")
  - Remove item, clear cart
- **Customer Selection**:
  - Search customers by name/phone, select walk-in
  - Apply customer-specific discounts, loyalty points
- **Checkout**:
  - Multiple payment methods (Cash, M-Pesa, Card, Credit, Split Payment)
  - Cash drawer management, change calculation
  - Payment notes (e.g., "Customer paid with KES 1000 note")
- **Loyalty Points**:
  - Earn points, redeem points for discounts
- **Discounts**:
  - Percentage discount, fixed amount discount, coupon codes
- **Hold/Retrieve Order**:
  - Hold order for later, retrieve held orders
- **Quick Actions**:
  - Suspend sale, open cash drawer, reprint last receipt
- **Customer-Facing Display**:
  - Support for secondary display showing:
    - Order items, running total
    - Promotions/ads
    - Payment status

---

### 2. Orders History
- **Transaction List**:
  - Local transactions, filters (date, cashier, payment method)
  - Search by transaction ID or customer name
- **Transaction Details**:
  - Full transaction breakdown, reprint receipt, email receipt
  - Void transaction (with manager PIN if required)
  - Return items (partial/full return)

---

### 3. Customers
- **Customer List**:
  - Local customers, search by name/phone
- **Customer Details**:
  - Customer info, balance, loyalty points, purchase history
- **Credit Payments**:
  - Record credit payments, view payment history
- **Add Customer**:
  - Quick add customer (name, phone)

---

### 4. Inventory Lookup
- **Product Search**:
  - Search products by name, barcode, category
- **Product Details**:
  - Local stock level, price, category, description
  - Store stock level (if online)

---

### 5. X-Report (Shift Summary)
- **Mid-Shift Report**:
  - Sales since last Z-Report or X-Report
  - Payment method breakdown
  - Number of transactions
  - Top items sold

---

### 6. Z-Report (Daily Closing)
- **Full Closing Report**:
  - Complete daily summary
  - Payment method breakdown (Cash, M-Pesa, Card, Credit)
  - Cash drawer count (expected vs actual)
  - Tips/gratuities
  - Top items sold
  - Cashier performance
  - Print closing report

---

### 7. Receipts
- **Receipt History**:
  - List of receipts, reprint, duplicate print
  - Email receipt to customer
- **Duplicate Receipt Mode**:
  - Print customer + cashier copies automatically

---

### 8. Settings
- **Outlet Settings**:
  - Outlet name, theme (Dark/Light)
- **Printer Settings**:
  - Default printer, paper width, test print
- **Sync Status**:
  - Last sync time, pending operations, sync now button
- **About**:
  - Version info, support contact

---

### 9. Offline Mode Dashboard
- **Offline Status Indicator**:
  - Clear "You are offline" banner
- **Queued Operations**:
  - List of changes waiting to sync
  - Estimated sync time when back online
- **Local Stock Only**:
  - Work with local inventory while offline

---

## 25. Extra Improvements & Additional Features

### 1. Table Management (For Restaurants/Cafes)
- **Table Layout**: Visual table map, drag-and-drop seating
- **Table Status**: Available, Occupied, Needs Cleaning
- **Split Bills**: Split bill by item, by person, equally
- **Order Types**: Dine-in, Takeaway, Delivery

---

### 2. Recipe & Ingredient Tracking (For Food Businesses)
- **Recipes**: Define recipes for products (e.g., "1 Burger = 1 Bun + 1 Patty + 1 Cheese")
- **Ingredient Deduction**: Auto-deduct ingredients from stock when product is sold
- **Waste Tracking**: Track ingredient waste

---

### 3. Purchase Orders & Supplier Deliveries
- **Create PO**: Create purchase orders from suppliers
- **Receive Stock**: Receive items into store stock, update inventory
- **PO History**: Track all purchase orders

---

### 4. Gift Cards
- **Sell Gift Cards**: Sell gift cards with custom amounts
- **Redeem Gift Cards**: Accept gift cards as payment
- **Gift Card Management**: Track balances, issue refunds

---

### 5. Customer Self-Service Kiosk
- **Kiosk Mode**: Full-screen kiosk for customers to order themselves
- **Product Browser**: Customers browse products, add to cart, pay
- **Print Ticket**: Print order ticket for kitchen

---

### 6. Advanced Discount & Promotion Engine
- **Discount Types**:
  - Percentage off
  - Fixed amount off
  - BOGO (Buy One Get One)
  - Time-based discounts (e.g., "Happy Hour 3-5pm")
  - Coupon codes
- **Promotions**:
  - Bundle deals
  - Free items with purchase
  - Loyalty rewards

---

### 7. Employee Scheduling & Time Clock
- **Scheduling**: Create employee schedules
- **Time Clock**: Employees clock in/out
- **Hours Tracking**: Track hours worked, integrate with payroll

---

### 8. Multi-Currency & Multi-Tax
- **Multi-Currency**: Accept payments in multiple currencies
- **Multi-Tax**: Different tax rates per product, per outlet
- **Tax Inclusive/Exclusive**: Toggle tax display

---

### 9. Barcode & Label Printing
- **Label Designer**: Design custom barcode labels
- **Print Labels**: Print labels for products
- **Barcode Scanner Integration**: Use barcode scanners to add items to cart

---

### 10. Online Order Integration
- **Online Orders**: Accept orders from website/mobile app
- **Order Sync**: Auto-sync online orders to POS
- **Delivery Management**: Track delivery status

---

### 11. API & Webhooks
- **REST API**: Full REST API for custom integrations
- **Webhooks**: Get notified of events (e.g., new sale, low stock)
- **Third-Party Integrations**: Connect to accounting software, delivery platforms, etc.

---

### 12. Mobile App Companion (For Managers)
- **Dashboard**: View real-time sales, outlet status
- **Approve Transfers**: Approve stock transfers from mobile
- **View Reports**: Access reports on the go
- **Notifications**: Get alerts for low stock, outlet offline, etc.

---

### 13. Enhanced Loyalty Program
- **Birthday Rewards**: Automatic birthday offers
- **Tier Benefits**: Perks for higher tiers (e.g., free coffee for Platinum members)
- **Referral Program**: Reward customers for referring friends
- **Points Expiry**: Set points to expire after a period

---

### 14. Inventory Expiry Tracking (For Perishables)
- **Expiry Dates**: Track expiry dates for perishable products
- **Expiry Alerts**: Get alerts when products are about to expire
- **FIFO**: First-In-First-Out stock rotation

---

### 15. Customer Feedback & Reviews
- **Post-Sale Feedback**: Ask customers for feedback after sale
- **Review Management**: View and respond to reviews
- **Feedback Reports**: Analyze feedback trends

---

### 16. Kitchen Display System (KDS)
- **Kitchen Orders**: Send orders directly to kitchen display
- **Order Status**: Track order status (New → Preparing → Ready)
- **Ticket Timers**: Track preparation time

---

### 17. Drive-Thru Mode
- **Drive-Thru Layout**: Optimized for drive-thru operations
- **Order Taking**: Quick order entry for drive-thru
- **Order Staging**: Track orders at staging area

---

### 18. Membership & Subscription Management
- **Memberships**: Sell memberships (e.g., "Coffee of the Month")
- **Subscriptions**: Recurring orders/subscriptions
- **Auto-Renewal**: Auto-renew subscriptions

---

### 19. Enhanced Security
- **Two-Factor Authentication (2FA)**: Add 2FA for manager/admin logins
- **IP Restriction**: Restrict server access to certain IPs
- **Session Timeout**: Auto-logout after inactivity
- **Data Encryption**: Encrypt sensitive data at rest and in transit

---

### 20. Accessibility (WCAG Compliance)
- **Screen Reader Support**: Full screen reader compatibility
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast Mode**: High contrast theme for visually impaired
- **Font Size Adjustment**: Adjustable font sizes

---

## Final Notes

This document is the official blueprint for Whiz POS Multi Outlets Version 8.0.0. All development must follow this architecture.
## Status Snapshot - May 26, 2026

### Actual current position

This codebase is no longer just a blueprint. The Electron shell, SQLite-backed persistence, server/outlet mode split, login flow, backup/restore, outlet registration, approval polling, and most major UI surfaces are already implemented.

The project is currently best described as:
- Working desktop multi-outlet prototype
- Real local persistence with Electron + SQLite
- Strong server and outlet UI coverage
- Partial sync/network services
- Some architecture/services still in prototype form

### Fixes completed in this pass

#### Runtime and onboarding
- Fixed the setup flow in `BusinessRegistration.tsx`
- Corrected `readData()` usage for existing setup lookup
- Replaced the broken setup step setter
- Restored missing onboarding icon imports
- Fixed outlet startup so a clean outlet instance now shows registration instead of dropping into the outlet shell without setup

#### Product, scanner, and outlet inventory fixes
- Standardized new product creation back to numeric product IDs
- Fixed barcode/product matching to compare IDs safely during scans and manual lookups
- Fixed outlet stock push to respect the outlet's configured `port`
- Fixed inventory image rendering so remote image URLs no longer break by being forced into `local-asset://`

#### Typing and sync corrections
- Updated shared app types to match the real renderer/store usage more closely
- Expanded `window.electron` typings to match the APIs exposed by `preload.js`
- Fixed expense screens to use `addExpense`
- Fixed `MultiOutletManager.tsx` compile/runtime mismatches
- Added sync support for `update-business-setup`
- Improved queued image handling so offline product image updates keep their saved local path and are converted into real product updates before sync

#### Fresh dev reset support
- Added `npm run reset`
- Strengthened `reset-dev.cjs` to clear all common Whiz POS dev data locations, including:
  - `C:\ProgramData\whiz-pos`
  - `C:\Users\<user>\AppData\Roaming\whiz-pos`
  - `C:\Users\<user>\AppData\Local\whiz-pos`
- This is now the recommended way to restart server/outlet dev testing from a clean state

### What is already solid

- `npm run dev`, `npm run dev:server`, and `npm run dev:outlet`
- Electron desktop shell
- SQLite persistence and migration direction
- PIN auth flow
- Backup and restore flow
- Outlet registration and approval direction
- Large parts of the server and outlet UI

### Still partial

- `UDPDiscoveryService.ts` is still more prototype than finished LAN discovery
- `SyncEngineService.ts`, `StockDistributionService.ts`, and `ServerOutletCommunicationService.ts` still need production-grade implementation depth
- Reporting and advanced stock workflows are still incomplete in places
- The folder structure described below is still the target architecture, not the current exact repo layout

### Fresh-start command

```bash
npm run reset
```
