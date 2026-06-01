<div align="center">

# WHIZ POS

### Enterprise Multi-Outlet Retail Infrastructure

Real-time synchronization, offline-first architecture, intelligent outlet discovery, inventory control, credit management, reporting, and enterprise scalability — all in a single desktop platform.

<br>

[Getting Started](#quick-start) •
[Features](#features) •
[Architecture](#architecture) •
[Roadmap](#roadmap)

<br>

![GitHub stars](https://img.shields.io/github/stars/mburuwhiz/Whiz_POS_multioutlets?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/mburuwhiz/Whiz_POS_multioutlets?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/mburuwhiz/Whiz_POS_multioutlets?style=flat-square)
![License](https://img.shields.io/github/license/mburuwhiz/Whiz_POS_multioutlets?style=flat-square)

</div>

---

# Built for Modern Retail

WHIZ POS is a multi-outlet point-of-sale platform designed for businesses that need centralized control while allowing branches to operate independently.

From a single shop to hundreds of locations, WHIZ POS keeps products, inventory, sales, users, and business intelligence synchronized across the entire organization.

---

# Features

## Multi-Outlet Operations

* Unlimited outlet support
* Centralized management
* Branch independence
* Outlet approval workflow
* Outlet-specific inventory
* Outlet-specific users
* Outlet-specific reports

## Sales & Checkout

* Lightning-fast POS
* Barcode support
* Custom receipts
* Thermal printing
* Split payments
* Discounts
* Returns handling
* Credit sales
* Customer balances

## Inventory Management

* Product catalog
* Stock tracking
* Categories
* Variants
* Low stock alerts
* Stock transfers
* Outlet assignments
* Inventory history

## Synchronization Engine

* Real-time synchronization
* Conflict resolution
* Incremental syncing
* Background synchronization
* Automatic recovery
* Multi-device consistency

## Offline-First Architecture

* Continue selling offline
* Local database support
* Automatic recovery
* Sync when reconnected
* Zero downtime operations

## Network Discovery

* mDNS discovery
* Automatic server detection
* Plug-and-play deployment
* No manual IP configuration

## User Management

* Administrators
* Managers
* Cashiers
* Permissions system
* Access control
* Activity tracking

## Reporting & Analytics

* Daily sales
* Outlet performance
* Product performance
* Revenue tracking
* Profit insights
* Inventory analytics
* Exportable reports

## Security

* Authentication
* Authorization
* Protected routes
* Secure synchronization
* Data validation

## Enterprise Ready

* Multi-branch support
* Scalable architecture
* Large inventory support
* Large transaction volumes
* Business continuity design

---

# Architecture

```text
                     MAIN SERVER

        Products • Inventory • Users • Reports

                              │
                              │
                              ▼

      ┌────────────── Synchronization ──────────────┐
      │                                             │
      ▼                                             ▼

   Outlet A          Outlet B          Outlet C

      │                 │                 │

      └──── Real-Time + Offline-First ───┘
```

---

# Technology Stack

| Layer            | Technology                   |
| ---------------- | ---------------------------- |
| Frontend         | React                        |
| Desktop Runtime  | Electron                     |
| Language         | TypeScript                   |
| Styling          | Tailwind CSS                 |
| State Management | Zustand                      |
| Build Tool       | Vite                         |
| Backend          | Express                      |
| Discovery        | mDNS                         |
| Sync Engine      | Custom Synchronization Layer |

---

# Project Structure

```text
Whiz_POS_multioutlets/

├── assets/
├── src/
│   ├── components/
│   ├── pages/
│   ├── store/
│   ├── sync/
│   ├── lib/
│   └── main/
│
├── electron.cjs
├── preload.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

# Quick Start

```bash
git clone https://github.com/mburuwhiz/Whiz_POS_multioutlets.git

cd Whiz_POS_multioutlets

npm install
```

Run Server

```bash
npm run dev:server
```

Run Outlet

```bash
npm run dev:outlet
```

Build Production

```bash
npm run build
```

---

# Use Cases

* Retail Chains
* Supermarkets
* Pharmacies
* Hardware Stores
* Electronics Shops
* Restaurants
* Distribution Businesses
* Franchise Networks
* Wholesale Operations

---

# Roadmap

## Completed

* Multi-Outlet Architecture
* Real-Time Sync
* Offline-First Operations
* Inventory Management
* Credit Customers
* Role Management
* Receipt Printing
* Automatic Discovery

## Planned

* Mobile Companion App
* Cloud Synchronization
* Multi-Warehouse Support
* Supplier Management
* AI Sales Forecasting
* Automated Backups
* Advanced Analytics

---

# Contributing

Contributions, feature requests, and pull requests are welcome.

---

# License

MIT License

---

<div align="center">

WHIZ POS

Enterprise Retail Infrastructure

Built for scale.

</div>
