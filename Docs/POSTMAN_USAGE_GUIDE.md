# Postman Usage Guide — Together In India 🚀

Welcome to the **Together In India API QA & Integration Hub**. This comprehensive environment and collection are designed to act as your single source of truth for all API smoke testing, frontend integration, and regression flows.

## 📥 Required Files
1. **`Together_India_Full_API_Collection.postman_collection.json`** - The primary API definitions containing all 30+ enterprise suites.
2. **`Together_India_Local.postman_environment.json`** - The local environment containing automated variables like `baseUrl`, `adminToken`, `vendorToken`, and IDs.

### Setup Instructions
1. Open Postman.
2. Go to **File -> Import** and select both JSON files mentioned above.
3. In the top right corner of Postman, select the environment **Together India Local**.

---

## 🔐 Auth Token Auto-Flow
You do **not** need to manually copy and paste tokens. The collection includes **Pre-request and Test scripts** that handle workflows autonomously:
- When you run **`Auth -> Login (Admin)`**, the script automatically extracts the `accessToken` from the response and saves it as the `{{adminToken}}` environment variable.
- All Administrator endpoints natively attach `Bearer {{adminToken}}` in their Header.
- Similarly, logging in as a Vendor updates `{{vendorToken}}`.

## 📂 Collection Structure Overview
The Postman collection is organized exactly like our actual node directory structure mirroring the domain-driven suites:

* **01 - Public Views**: Handles `/search`, `/pages/render`, rendering APIs, and autocomplete. (No token needed).
* **02 - Auth & Users**: Login, Register, OTP verification, Password Reset.
* **03 - Core Business Modules**: Core modules for vendor onboarding, generic listings, media upload, CMS components, and SEO Config.
* **04 to 10 - Specialized Business Suites**: `Hotels`, `Things To Do`, `Restaurants`, `Kids World`, `World Tribes`, `Destinations`, `Shops`. 
* **11 - Monetization Engine**: Creating `Plans`, purchasing `Subscriptions`, assigning `Slots`.
* **12 - Engagement**: `Lucky Draw`, `Inquiries`, `Wishlist`.
* **13 - Analytics & Reports**: `Events`, ROI breakdowns, and Vendor dashboards.

---

## 🛠️ Testing Workflows (Chained Data)

This collection is built to support end-to-end testing cycles without manual ID hopping. We use Postman variables to inject newly created objects directly into the next API calls.

### Smoke Testing Order
We recommend running specific workflows to verify the complete backend state:

**Flow 1: Vendor Creation to Listing Publication**
1. **Auth:** Register a New Vendor User -> Log In (saves `{{vendorToken}}`).
2. **Vendors:** Submit KYC -> Super Admin Approves Vendor.
3. **Hotels Suite:** Create Hotel Listing (saves `{{listingId}}`).
4. **Hotels Suite:** Create Hotel Room -> Add Pricing Calendar.
5. **Listings Core:** Update Status to published.
6. **Public:** Hit Search -> Verify the hotel appears.

**Flow 2: Monetization & Priority Upgrade**
1. **Subscriptions:** Buy Silver Plan for Vendor (Admin activates the sub -> saves `{{subscriptionId}}`).
2. **Monetization:** Admin assigns `HOMEPAGE_FEATURED` slot mapping the `{{subscriptionId}}` and `{{listingId}}`.
3. **Public:** Hit Search -> Observe the hotel now has a priority score of `2` (Silver) and rises to the top rank.

**Flow 3: Multipart Forms & Cloudinary**
* To test uploads, go to `Media Uploads -> Upload Single`.
* Important: You must manually attach a file in the Body tab (select `form-data`, switch key type from `text` to `file`). The backend will send it identically to Cloudinary and return the variants array.

## 🧪 Response Assertions
Almost every core mutation endpoint includes automated `Tests` in the Postman UI checking for:
- `Status Code 20x`
- Response time under `500ms` for cached features, `1200ms` for DB hits
- Non-null DB IDs (`data._id` exists)

Run the **Postman Runner** against the whole collection folder to perform a comprehensive regression check against the local DB.
