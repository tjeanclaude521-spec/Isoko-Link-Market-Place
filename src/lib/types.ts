export type UserRole = 'farmer' | 'buyer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  role: UserRole;
  district: string;
  sector: string;
  village: string;
  verified: boolean;
  business_description: string;
  profile_photo_url: string;
  created_at: string;
  updated_at: string;
}

export interface SellerProfile {
  id: string;
  full_name: string;
  business_description: string;
  profile_photo_url: string;
  district: string;
  sector: string;
  phone: string;
  whatsapp: string;
  verified: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_rw: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  farmer_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  unit: string;
  quantity_available: number;
  district: string;
  sector: string;
  village: string;
  contact_phone: string;
  contact_whatsapp: string;
  status: 'active' | 'paused' | 'removed' | 'rejected';
  image_url: string;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  farmer?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'whatsapp' | 'district' | 'sector' | 'verified' | 'business_description' | 'profile_photo_url'> | null;
}

export interface Promotion {
  id: string;
  product_id: string;
  farmer_id: string;
  amount: number;
  duration_days: number;
  start_date: string | null;
  end_date: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  payment_id: string | null;
  created_at: string;
  product?: Pick<Product, 'id' | 'name' | 'image_url'> | null;
  farmer?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface Enquiry {
  id: string;
  reference: string;
  product_id: string;
  farmer_id: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_whatsapp: string;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  created_at: string;
  product?: Pick<Product, 'id' | 'name' | 'image_url' | 'price' | 'unit' | 'contact_phone' | 'contact_whatsapp' | 'farmer_id'> | null;
}

export interface Sale {
  id: string;
  product_id: string;
  farmer_id: string;
  buyer_id: string | null;
  buyer_name: string;
  enquiry_id: string | null;
  sale_amount: number;
  quantity_sold: number;
  unit: string;
  commission_rate: number;
  commission_amount: number;
  seller_amount: number;
  status: 'reported' | 'confirmed' | 'disputed' | 'cancelled' | 'completed';
  farmer_confirmed: boolean;
  buyer_confirmed: boolean;
  admin_notes: string;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  product?: Pick<Product, 'id' | 'name' | 'image_url'> | null;
  farmer?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface Payment {
  id: string;
  user_id: string;
  purpose: 'advertisement' | 'commission' | 'refund';
  amount: number;
  payment_method: string;
  transaction_ref: string;
  related_promotion_id: string | null;
  related_sale_id: string | null;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_product_id: string | null;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  admin_notes: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  reported_user?: Pick<Profile, 'id' | 'full_name'> | null;
  reported_product?: Pick<Product, 'id' | 'name'> | null;
}

export interface Testimonial {
  id: string;
  name: string;
  district: string;
  sector: string;
  product_type: string;
  quote: string;
  quote_rw: string;
  photo_url: string;
  rating: number;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export interface PlatformSettings {
  id: string;
  promotion_price: number;
  promotion_duration_days: number;
  commission_rate: number;
  updated_by: string | null;
  updated_at: string;
}
