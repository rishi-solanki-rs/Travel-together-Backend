# Together In India — Project Flow & Execution Guide

This document explains exactly how to run the Together In India API, how data flows through the system, and how to sequentially test all critical routes via Postman.

---

## 1. Starting the Project

### Prerequisites
1. **Database:** Ensure the MongoDB SRV string in `.env` is correct.
2. **Redis:** A local Redis instance is required for caching (Cities, Categories, CMS Pages). If you don't have Redis on your local machine, run via Docker:
   `docker-compose up -d redis`
3. **Dependencies:** Ensure `npm install` has been run.

### Running Seeders
Before you start the project for the very first time, seed the foundational data:
```bash
npm run seed
```
**What this does:**
- Creates a predefined **Super Admin User** (admin@togetherinIndia.com / Admin@123456).
- Creates all 7 **Global Categories** (Hotels, Tours, Restaurants, Shops, Tribes, Kids World, Destinations) and their 28 Subtypes.
- Creates **15 Featured Indian Cities** with geo-locations.
- Appends the 4 core **Vendor Subscription Plans** (Free, Red, Silver, Gold).

### Starting the Server
```bash
npm run dev
```
The server will bind to `http://localhost:5000`. A health check ping is available at `GET /health`.

---

## 2. Testing the Data Flow (Postman)

Use the generated `Together_In_India_Postman.json` collection to execute these flows.

### A. Authentication & User Login
1. **Login:** Send a `POST /api/v1/auth/login` containing the admin credentials.
2. **Access Tokens:** The response returning a JWT (`accessToken`). Set this token as a Bearer Token in Postman under the Collection Variables.
   
### B. Browsing the Public Ecosystem (Frontend Integration)
The public interface is designed for high-concurrency reading without authentication:
1. **Global Search:** `GET /api/v1/search?q=hotel&cityId=<city_id>`
   Tests standard text indexes combined with pagination and strict filtering.
2. **CMS Render Engine:** `GET /api/v1/pages/render/home`
   Returns the actively composed layout of the homepage! It pulls data from MongoDB but rapidly caches it into Redis for subsequent calls.
3. **Categories:** `GET /api/v1/categories` – Returns the cached array of the 7 main business groups.

### C. The Vendor Lifecycle
Vendors can be mapped inside the application to operate distinct businesses:
1. **Create Vendor:** `POST /api/v1/vendors` (A standard user upgrades themselves, awaiting KYC/activation).
2. **Admin Approval:** `PATCH /api/v1/vendors/:id/approve` using the Super Admin JWT.
3. **Listings Creation:** The vendor logs in, hits `POST /api/v1/hotels` (or relevant category suite) to create a Draft profile. Includes details, rooms, algorithms.
4. **Publish Workflow:** Vendor converts the Draft -> Published stage. The `ListingBase` global index updates, meaning it now appears in `/search`.

### D. Subscriptions & Monetization
1. **Vendor buys Plan:** Vendor requests to upgrade from Free to Silver Plan (`POST /api/v1/subscriptions`).
2. **Buy Slot:** Vendor wants Homepage exposure. Purchases a slot via `POST /api/v1/slots/assign`.
3. **Consequence:** The vendor's Listing instantly gets `isFeatured=true` and their plan priority goes up, pushing their listing above 'Free' tiered listings locally and globally.

### E. Engagement Lifecycle
1. **Lucky Draw:** A user clicks on a lucky draw campaign. Sends `POST /api/v1/lucky-draw/:id/enter`. Their user ID is appended.
2. **Inquiries:** A customer interested in a Package sends `POST /api/v1/inquiries` containing questions. The connected Vendor receives a real-time email template. 
3. **Wishlist:** `POST /api/v1/wishlist/toggle` instantly updates the `stats` field on the specific listing, ensuring we have immediate tracking.

---

## 3. Automation (Cron Validations)

While the app is actively running, **node-cron** processes manage state handling securely:
- Run the server overnight. Notice that at exactly 09:00 AM, `subscriptionRenewalJob` scans all active Vendor subscriptions to flag expiration windows, emailing them seamlessly.
- Every night at Midnight (`0 0 * * *`), the `luckyDrawPickerJob` analyzes any closed sweepstakes and executes a mathematically rigorous random draw, awarding winners accurately and dispatching emails.

---
You are officially ready for hand-off frontend deployment via React/Next.js!
