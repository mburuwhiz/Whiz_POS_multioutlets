# Whiz POS - Complete System Documentation v2.0

## Table of Contents
1. [System Overview](#system-overview)
2. [New Sync System](#new-sync-system)
   - [Key Changes](#key-changes)
   - [Directory Structure](#directory-structure)
   - [mDNS Discovery](#mdns-discovery)
   - [WebSocket Protocol](#websocket-protocol)
   - [Data Models](#data-models)
3. [Marketing & Documentation Website (`pos.whizpoint.app`)
   - [Landing Page](#landing-page)
   - [Documentation Section](#documentation-section)
   - [Contact & Sales Page](#contact--sales-page)
   - [SEO & Performance](#seo--performance)
4. [Back-Office & POS System](#back-office--pos-system)
5. [Brevo Email Integration](#brevo-email-integration)

---

## System Overview

**Domains**:
- **Marketing/Docs**: `pos.whizpoint.app` - Lives in `/website` directory
- **Desktop POS App**: Electron app (Server/Outlet modes)
- **New Sync System**: No old code reused - brand new from scratch!

---

## New Sync System

### Key Changes
- **mDNS (Bonjour)** for automatic discovery of Server/Outlet devices
- **WebSocket (TCP)** for reliable bidirectional sync
- **Outlet ID is MANDATORY** for all outlets
- **Per-outlet stock tracking** on server
- No legacy HTTP sync - everything removed
- Complete rewrite from scratch

### Directory Structure
```
/src/sync/
├── types.ts                  # All sync-specific types
├── ws-client.ts           # Outlet-side WebSocket client
└── electron/
    ├── mdns-discovery.ts    # mDNS (Bonjour) discovery for Electron
    ├── ws-server.ts       # Server-side WebSocket sync server
    └── utils.ts          # Helpers for reading/writing JSON
```

### mDNS Discovery
Devices use mDNS (Bonjour) to find each other automatically!
- **Server** advertises as `whizpos._tcp` with `type=server`
- **Outlet** advertises as `whizpos._tcp` with `type=outlet`
- Each device has unique name, IP and port shared via mDNS TXT record

### WebSocket Protocol
All sync happens over WebSocket! Here are message types:

| Message Type | Description | Direction |
| --- | --- | --- |
| `authenticate` | Outlet sends its outlet ID to server | Outlet → Server |
| `auth_success` | Server confirms auth success | Server → Outlet |
| `sync_request` | Outlet requests full sync | Outlet → Server |
| `sync_response` | Server responds with full data (outlet, products, users, categories) | Server → Outlet |
| `transaction_send` | Outlet sends new transaction | Outlet → Server |
| `transaction_saved` | Server confirms tx saved | Server → Outlet |
| `stock_update` | Outlet sends stock changes | Outlet → Server |
| `heartbeat` / `heartbeat_ack` | Keep connection alive | Both ways |

### Data Models
- **Outlet**: 
  - `id`: Mandatory unique outlet ID
  - `name`: Outlet name
  - `initialStock`: Initial assigned stock
  - `currentStock`: Current actual outlet stock
- **Product**: Main store stock + outlet stock tracking
- **Transaction**: OutletId tracks which outlet sent it

---

## Marketing & Documentation Website (`pos.whizpoint.app`)

### Directory Structure
```
/website
├── index.html                 # Landing page
├── docs/
│   ├── index.html            # Docs landing
│   ├── installation.html     # Installation guide
│   ├── features.html         # Feature guide
│   └── troubleshooting.html  # Troubleshooting
├── contact.html              # Contact/Sales page
├── assets/                   # Shared with main POS
│   ├── logo.png
│   ├── logo.ico
│   ├── logo.svg
│   └── images/
└── styles/
    └── main.css
```

---

### Landing Page (`/`)

#### Hero Section
- **Headline**: "Modern Point-of-Sale for Every Business"
- **Subheadline**: "Fast, reliable, and packed with features to grow your sales"
- **CTA Buttons**:
  - Primary: "Get Started Free"
  - Secondary: "View Demo"
- **Visual**: Hero image of POS in use

#### Feature Grid (7 Features now)
1. **Offline-First**: Works without internet, syncs when connected
2. **Inventory Management**: **Per-outlet stock tracking, low-stock alerts**
3. **Multiple Payment Methods**: Cash, M-Pesa, Credit
4. **Sales Reports**: Daily, weekly, and monthly summaries
5. **Multi-User Support**: Cashiers, managers, and admins with permissions
6. **Credit Customers**: Track credit sales and payments
7. **Auto-Discovery**: mDNS finds server/outlet automatically

---

## Back-Office & POS System
(Same as previous, with updated sync docs)

---

## Brevo Email Integration
(Same as previous)
