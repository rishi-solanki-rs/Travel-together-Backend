# CURRENT BACKEND AUDIT
**Project**: Together In India Enterprise Backend
**Date**: 2026-04-06

## 1. Folder Structure & Module Boundaries
The backend follows a strong **Domain-Driven Design (DDD)** structure under `src/modules/` with 30 distinct domains encapsulating controllers, services, and routes. A robust `src/shared/models` directory successfully unifies data definitions across endpoints.

**Strengths**: High modularity. The separation of `listings` vs `hotels` vs `restaurants` is well-bounded. Shared constants and enums are mature.
**Weaknesses**: Module formats are significantly inconsistent. Files like `auth.service.js` use CommonJS (`require`), while `HotelRoom.model.js` uses ECMAScript modules (`import`). This risks deployment failures on stricter CI environments despite Node's newer forgiving backward compatibility.

## 2. Shared Core Status
- **Auth & Permissions**: Stable, integrated with JWT refresh chains and user lockouts.
- **CMS & Pages**: Highly evolved, directly hooked into Redis.
- **Media Pipeline**: Cloudinary integration is well-written structurally via `cloudinaryHelper.js`.
- **Database Indexing**: Multiple duplicate index warnings detected during startup (`unique: true` vs `index: true`), polluting standard logs. 

## 3. Business Suites Assessment
- **Hotel Suite**: Schemas exist (`Hotel`, `HotelRoom`, `HotelPricingCalendar`) but they lack complete validation bridges and deeply integrated availability logic within `hotels.controller.js`.
- **Things To Do**: Basic routing established, but complex mechanics (Itinerary days mapping, capacity limiting) exist only in schema theory.
- **Category & Subtype Engine**: Core framework mapped out, but the "Dynamic Template Engine" needs actual payload processing capability in controllers.

## 4. Technical Quality Standards
- **Middleware**: Exceptionally strong. `authenticate`, `authorize`, `rateLimiter`, `errorHandler` are enterprise pattern compliant.
- **Logging**: Superb. Pino logger integrated seamlessly.
- **Error Handling**: `ApiError` utility correctly bridges `asyncHandler` logic preventing memory leaks on unhandled promises.
- **Code Smells**: 
   - Mixed ES6 syntaxes (`import` vs `require`).
   - Mongoose Duplicate Schema Indexes (`slug`, `key`, `listingId`).
   - The slot logic has DB schemas but needs strict cron and availability overlap enforcement algorithms.

## 5. Frontend Integration Risks
The API surface is vast. The risk lies in "hollow routes" — endpoints that look correct in Postman but do not map complex nested geometries (e.g. `bedConfiguration` inside `HotelRoom` arrays) safely during POST operations.
