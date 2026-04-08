# Together In India — Enterprise Backend Implementation Guide

Welcome to the backend documentation for the **Together In India** enterprise platform. This guide serves as a comprehensive overview of the architecture, modules, and setup instructions for the backend service.

## 1. Architecture Overview

This backend is built as a highly scalable, robust, and modular monolith using **Node.js, Express, MongoDB, and Redis.**

### Core Pillars
1. **Domain-Driven Design**: Features are encapsulated into highly isolated modules (e.g., `hotels`, `vendors`, `destinations`, `slots`).
2. **Hybrid Listing Core**: All marketplace items share a central `ListingBase` index (for global searching, SEO, and visibility), but business-specific data logic is handled by Extension models (`Hotel`, `TourItinerary`, `Restaurant`, `ShopCatalog`).
3. **Caching Layer**: `ioredis` is aggressively utilized for endpoints that serve the frontend (e.g., Pages, CMS, Categories, Cities, Plans), with precise cache invalidation on writes.
4. **Resilient Media Pipeline**: `multer` memory storage uploads directly to **Cloudinary**, generating automatic URL variants (`mobile`, `desktop`, `thumbnail`, `seo`).
5. **Security & Validation**: Every endpoint relies on **Zod** schema validations, `helmet` edge security, and dual-layer rate limiters (`global` and `auth-specific`). JWT handles refresh rotation and access.

## 2. Platform Scopes

The API dictates access controls via three distinct scopes handled by custom authorization middlewares (`authenticate`, `authorize`):

- **[PUBLIC]**: The customer-facing interface. Fast, read-heavy, often cached. Does not require token authentication. (e.g., `/api/v1/pages/render/:slug`, `/api/v1/search`)
- **[VENDOR ADMIN]**: Business owners and operational staff managing their suite. Regulated via `isVendor` and `isVendorAdmin` middlewares.
- **[SUPER_ADMIN & CITY_ADMIN]**: Internal platform operators. Controls approvals, slot overrides, global CMS, and lucky draws. Regulated by `isAdmin`.

## 3. Directory Structure

```text
src/
├── bootstrap/       # Application initialization (routes, cron, swagger)
├── config/          # Configurations (env validation, db, redis, cloudinary)
├── jobs/            # Standalone cron tasks (expiry, schedule, aggregation)
├── middlewares/     # Auth, Zod Validation, Catch-All Errors
├── modules/         # Encapsulated Business Features
│   ├── auth/        # Login, Reset, Token Rotation, Limiters
│   ├── cms/         # Dynamic Sections with Scheduling
│   ├── pages/       # Section Assembler Engine for Frontend
│   ├── slots/       # Monetization engine, priority queueing
│   ├── hotels/      # Business Suite Example
│   └── ...          # 25+ distinct domains
├── seeders/         # Environment kickstart data
├── shared/
│   ├── constants/   # Enums, Defaults, Priorities
│   └── models/      # Mongoose Schema Definitions
└── utils/           # Global helpers (ApiResponse, mailer, Cloudinary)
```

## 4. Automation (Cron Jobs)

We rely on `node-cron` within the Express lifetime to execute critical automation:
- **Campaign Scheduler**: Auto-activates and ends Lucky Draw campaigns based on defined `startDate` and `endDate`.
- **Slot Expirer**: Scans for vendor premium slot assignments that have expired, restoring inventory space and removing the vendor's 'featured' flags.
- **Subscription Renewal**: Checks for 7-day expiring vendor subscriptions and triggers email reminders.
- **Analytics Aggregator**: A nightly aggregation pipeline that summarizes raw click/view/inquiry events and writes them efficiently to the `ListingBase.stats` object.

## 5. Development & Operations Runbook

### Installation & Environment
1. Node.js v18+ is required.
2. Ensure you have Docker installed (for local Mongo + Redis).
3. Copy `.env.example` to `.env` and fill in necessary secrets (Cloudinary keys, MongoDB URI, SMTP, JWT).
4. Run `npm install`.

### Local Execution (Docker)
We use Docker for backing services. You can spin them up easily:
```bash
docker-compose up -d mongo redis
```
Then start the development server:
```bash
npm run dev
```

### Initializing the System
For a fresh environment, run the seeder script. This injects the Super Admin, all Categories, core Cities, and Monetization Plans.
```bash
npm run seed
```

### Deployment Strategy
The provided `Dockerfile` leverages `node:20-alpine` with `dumb-init` for graceful shutdown handling. 
For a complete orchestrated local stack, simply:
```bash
docker-compose up -d
```
All environment variables map securely to the application cluster.

## 6. End-to-End Testing & Mocking
- **Swagger Documentation**: Accessible automatically at `/api/v1/docs` in non-prod environments.
- Use `npm run swagger:gen` to dump the JSON schema.
- To test the CMS driven frontend API, view the output of `/api/v1/pages/render/home`.

## 7. Adding new Business Suites
If the marketplace scales and requires a new vertical (e.g. `EventVenues`):
1. Define `EventVenue.model.js` in `shared/models/` extending `ListingBase` behavior.
2. Update global `CATEGORIES` in `constants/index.js`.
3. Create `src/modules/eventVenues/` with service, controller, and routes.
4. Plug routes into `bootstrap/registerRoutes.js`.
