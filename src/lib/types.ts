// Core domain types for PetStay platform.
// These mirror the Postgres schema in supabase/migrations/0001_init.sql.

export type ShopStatus = "pending_review" | "active" | "suspended" | "rejected";

export type PetType = "dog" | "cat" | "rabbit" | "other";

export type PetSize = "small" | "medium" | "large" | "xlarge";

export type ShopMemberRole = "owner" | "staff";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "checked_in"
  | "checked_out"
  | "no_show";

export type NotificationChannel = "email" | "line";

export type NotificationKind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_reminder"
  | "booking_cancelled";

export type AdminRole = "admin" | "super_admin";

export interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  city: string | null;
  district: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  line_oa_url: string | null;
  pet_types: PetType[];
  status: ShopStatus;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: ShopMemberRole;
  display_name: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  photo_urls: string[];
  total_count: number;
  price_per_night: number;
  pet_types: PetType[];
  pet_sizes: PetSize[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoomInventoryOverride {
  id: string;
  room_id: string;
  date: string;
  available_count: number | null;
  price_override: number | null;
  note: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  code: string;
  shop_id: string;
  room_id: string;
  customer_id: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_note: string | null;
  pet_name: string;
  pet_type: PetType;
  pet_size: PetSize | null;
  pet_breed: string | null;
  pet_note: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_price: number;
  status: BookingStatus;
  source: "web" | "liff";
  created_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export interface BookingOccupancy {
  id: string;
  booking_id: string;
  room_id: string;
  date: string;
}

export interface Customer {
  id: string;
  line_user_id: string | null;
  display_name: string | null;
  picture_url: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_active_at: string | null;
}

export interface NotificationTemplate {
  id: string;
  shop_id: string;
  kind: NotificationKind;
  subject: string;
  body: string;
  is_default: boolean;
  updated_at: string;
}

export interface Notification {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  channel: NotificationChannel;
  kind: NotificationKind;
  to_address: string;
  subject: string | null;
  content: string;
  status: "queued" | "sent" | "failed" | "delivered" | "read";
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  customer_id: string;
  shop_id: string;
  created_at: string;
}

export interface Admin {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
}

// --- Composite / response shapes from RPCs ---

export interface RoomAvailabilityDay {
  date: string;
  available: number;
  price: number;
}

export interface ShopSearchResult {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  cover_image_url: string | null;
  pet_types: PetType[];
  min_price: number | null;
}
