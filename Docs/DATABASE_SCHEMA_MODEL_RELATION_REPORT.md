# DATABASE SCHEMA MODEL RELATION REPORT
Generated: 2026-04-06
Scope: Together In India Backend

## 1. Objective
This document provides a practical model relation map and schema integrity checklist for the backend.

## 2. Data Layer Overview
- Primary database: MongoDB
- Data access pattern: Service + model access through module services
- Common schema themes:
  - User and vendor identity
  - Listings and catalog entities
  - Booking and order lifecycle entities
  - Payment and reconciliation entities
  - Audit and compliance entities

## 3. Core Entity Groups

### 3.1 Identity and Access
- User
- Vendor
- Role/Permission (if implemented in schema or policy records)
- Session/Token records (where persisted)

Likely relations:
- Vendor references User (owner account)
- Session references User
- Audit records reference actor User

### 3.2 Catalog and Content
- Category
- Subtype
- Listing
- Destination
- Hotel
- Restaurant
- Shop item
- ThingsToDo
- KidsWorld entities
- CMS Page/Sections

Likely relations:
- Listing references Category, City, Vendor
- Hotel/Restaurant/Shop reference Vendor and City
- CMS pages may include media references by URL or id

### 3.3 Booking and Orders
- Slot
- Hotel Booking
- Tour/Package Reservation
- Kids Activity Booking
- Shop Order / Cart

Likely relations:
- Booking references User, Vendor, inventory item (hotel room/slot/package)
- Order references User and item list
- Status transitions create finance and audit side effects

### 3.4 Monetization and Finance
- Payment Ledger / Transactions
- Refund entries
- Subscription / Plan mapping
- Reconciliation records

Likely relations:
- Payment records reference booking/order id and user/vendor context
- Subscription references vendor and plan
- Reconciliation references payment transaction ids

### 3.5 Observability and Governance
- Audit events
- Security events
- Notification logs
- Background job metadata

Likely relations:
- Audit events reference actor, entity type, entity id, and snapshot data

## 4. Relation Integrity Checklist
Use this checklist against each schema file under src/shared/models and module-owned model definitions.

- Foreign reference fields:
  - Ensure ObjectId references include explicit ref target
  - Ensure optional vs required reference fields are intentional
- Cascade behavior:
  - Document soft-delete and hard-delete behavior by entity
  - Prevent orphaned dependent records
- State machine consistency:
  - Booking and order statuses must be monotonic and validated
- Index strategy:
  - Add indexes for all high-volume filters: userId, vendorId, status, createdAt
  - Add unique constraints for business keys where needed
- Multi-tenant isolation:
  - Enforce vendor scoping in all queries
- Auditability:
  - Track before/after snapshots for sensitive updates

## 5. High-Risk Relation Zones
- Booking <-> Payment ledger mismatch risk under retries/timeouts
- Media <-> CMS content weak linkage when URLs are stored without strong reference keys
- Subscription renewals at scale if plan/vendor relation access is not indexed
- Cross-vendor access risk when listing queries omit vendor scoping

## 6. Recommended Validation Queries (Operational)
- Orphan detector:
  - Records with reference ids pointing to missing parent entities
- Duplicate business-key detector:
  - Potential duplicate bookings/orders for same user/item/time window
- Tenant leak detector:
  - Any query path returning records across vendor boundaries

## 7. Action Plan
- Step 1: Produce exact schema map from live model files (field-by-field matrix)
- Step 2: Add missing indexes and unique constraints
- Step 3: Add relation validation test suite (orphan, cascade, tenant scope)
- Step 4: Add idempotency guards on booking/order writes

## 8. Deliverable Status
- Baseline report generated
- Next update should include exact file-level schema tables from current model definitions
