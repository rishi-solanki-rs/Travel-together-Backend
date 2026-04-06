const PLATFORM = {
  NAME: 'Together In India',
  VERSION: '1.0.0',
};

const USER_ROLES = {
  SUPER_ADMIN: 'superAdmin',
  CITY_ADMIN: 'cityAdmin',
  VENDOR_ADMIN: 'vendorAdmin',
  VENDOR_STAFF: 'vendorStaff',
  USER: 'user',
};

const VENDOR_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
};

const KYC_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

const LISTING_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
};

const CATEGORIES = {
  HOTELS: 'hotels',
  THINGS_TO_DO: 'thingsToDo',
  RESTAURANTS: 'restaurants',
  SHOPS: 'shops',
  TRIBES: 'tribes',
  KIDS_WORLD: 'kidsWorld',
  DESTINATIONS: 'destinations',
};

const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  RED: 'red',
  SILVER: 'silver',
  GOLD: 'gold',
};

const PLAN_PRIORITY = {
  free: 0,
  red: 1,
  silver: 2,
  gold: 3,
};

const SLOT_TYPES = {
  HOMEPAGE_FEATURED: 'homepage_featured',
  CATEGORY_TOP: 'category_top',
  SUBTYPE_PREMIUM: 'subtype_premium',
  CITY_FEATURED: 'city_featured',
  CAROUSEL: 'carousel',
  DEAL_STRIP: 'deal_strip',
};

const SLOT_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  EXPIRED: 'expired',
  RESERVED: 'reserved',
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PENDING_PAYMENT: 'pending_payment',
  TRIAL: 'trial',
};

const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
};

const MEDIA_ROLES = {
  COVER: 'cover',
  GALLERY: 'gallery',
  THUMBNAIL: 'thumbnail',
  BANNER: 'banner',
  BACKGROUND: 'background',
  LOGO: 'logo',
  MENU: 'menu',
  ROOM: 'room',
  PRODUCT: 'product',
};

const CMS_SECTION_TYPES = {
  HERO_SLIDER: 'hero_slider',
  CATEGORY_TABS: 'category_tabs',
  LISTING_CAROUSEL: 'listing_carousel',
  CITY_BANNER: 'city_banner',
  DESTINATION_ROW: 'destination_row',
  HOTEL_ROW: 'hotel_row',
  SUBTYPE_SHOWCASE: 'subtype_showcase',
  LUCKY_DRAW_WIDGET: 'lucky_draw_widget',
  CTA_BANNER: 'cta_banner',
  DEAL_STRIP: 'deal_strip',
  IMAGE_GALLERY: 'image_gallery',
  TRIBE_STORY_ROW: 'tribe_story_row',
  KIDS_ACTIVITY_ROW: 'kids_activity_row',
  SHOP_PRODUCT_ROW: 'shop_product_row',
  RESTAURANT_PREVIEW: 'restaurant_preview',
  FEATURED_CITY_BLOCK: 'featured_city_block',
  TEXT_BLOCK: 'text_block',
  MAP_EMBED: 'map_embed',
};

const PAGE_TYPES = {
  HOME: 'home',
  CITY_LANDING: 'city_landing',
  CATEGORY: 'category',
  SUBTYPE: 'subtype',
  VENDOR_PROFILE: 'vendor_profile',
  LISTING_DETAIL: 'listing_detail',
  CAMPAIGN: 'campaign',
  CUSTOM: 'custom',
};

const INQUIRY_STATUS = {
  NEW: 'new',
  READ: 'read',
  REPLIED: 'replied',
  CONVERTED: 'converted',
  CLOSED: 'closed',
};

const LUCKY_DRAW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ENDED: 'ended',
  WINNER_PICKED: 'winner_picked',
  ARCHIVED: 'archived',
};

const ANALYTICS_EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  LISTING_IMPRESSION: 'listing_impression',
  LISTING_CLICK: 'listing_click',
  WISHLIST_ADD: 'wishlist_add',
  WISHLIST_REMOVE: 'wishlist_remove',
  INQUIRY_SENT: 'inquiry_sent',
  PHONE_REVEAL: 'phone_reveal',
  SHARE: 'share',
  LUCKY_DRAW_ENTRY: 'lucky_draw_entry',
  SLOT_VIEW: 'slot_view',
  SEARCH: 'search',
};

const NOTIFICATION_TYPES = {
  VENDOR_APPROVED: 'vendor_approved',
  VENDOR_REJECTED: 'vendor_rejected',
  LISTING_PUBLISHED: 'listing_published',
  INQUIRY_RECEIVED: 'inquiry_received',
  SLOT_EXPIRING: 'slot_expiring',
  SLOT_EXPIRED: 'slot_expired',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  LUCKY_DRAW_WINNER: 'lucky_draw_winner',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  SYSTEM: 'system',
};

const SORT_DIRECTIONS = { ASC: 'asc', DESC: 'desc' };

const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  NO_SHOW: 'no_show',
};

export {
  PLATFORM,
  USER_ROLES,
  VENDOR_STATUS,
  KYC_STATUS,
  LISTING_STATUS,
  CATEGORIES,
  SUBSCRIPTION_PLANS,
  PLAN_PRIORITY,
  SLOT_TYPES,
  SLOT_STATUS,
  SUBSCRIPTION_STATUS,
  MEDIA_TYPES,
  MEDIA_ROLES,
  CMS_SECTION_TYPES,
  PAGE_TYPES,
  INQUIRY_STATUS,
  LUCKY_DRAW_STATUS,
  ANALYTICS_EVENT_TYPES,
  NOTIFICATION_TYPES,
  SORT_DIRECTIONS,
  BOOKING_STATUS,
};
