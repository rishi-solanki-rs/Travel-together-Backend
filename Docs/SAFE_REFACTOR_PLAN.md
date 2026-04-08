# SAFE REFACTOR PLAN
**Project**: Together In India
**Date**: 2026-04-06

This document categorizes architectural findings into safe upgrade pathways per the engineering requirements.

## 1. KEEP AS IS (Working and Scalable)
- **Auth & JWT Mechanism**: Currently highly functional.
- **Middleware Layout**: `authenticate.js`, `authorize.js`, `rateLimiter.js`. Do not rewrite.
- **Mongoose Configuration**: Connecting correctly and safely to the Atlas cluster.
- **Cloudinary Core Helper**: Upload mechanisms work beautifully.

## 2. REFACTOR (Architecture Improvements)
- **Module Consistency (High Risk of Deployment Failure)**: The backend is mixing ES Modules (`import/export`) and CommonJS (`require`). Must normalize schemas previously generated identically to CommonJS to match `server.js` and `package.json` logic fully to prevent runtime compilation issues in strict CI/CD pipelines.
- **Database Index Cleansing**: Remove `index: true` where `unique: true` is already defined within schemas (like `User.model`, `Category.model`) to stop startup terminal pollution.
- **Service Reuse**: Normalize the `ListingBase` logic so `hotels.controller` and `restaurants.controller` share the same base publish operations.

## 3. UPGRADE (Missing Business Logic)
- **Hotel Date Pricing**: Upgrade `hotels.service.js` and controller to actively intersect `getPricingCalendar` when a user reads a hotel block so `basePrice` is dynamically altered based on date.
- **Slot Race Conditions**: Upgrade `slots.service.js` to use `mongoose.startSession()` (or `findOneAndUpdate` with `$inc`) ensuring atomic inventory reduction when assigning `Premium Homepage Slots`.
- **Things To Do Engine**: Inject proper validation so that `TourDepartures` legally enforce their `maxCapacity`.

## 4. ADD NEW 
- No completely bare modules needed (schemas already generated). The "New" additions are missing Controller operations for deep schema manipulation.

## 5. DEFER
- Extreme real-time Socket.io analytics.
- Complex ML-based Semantic Search integrations (the simple `$regex` base handles current needs).
