export enum UserRole {
  BASIC_USER = 'basic_user',
  COORDINATOR_ADMIN = 'coordinator_admin',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export enum EventType {
  MATCH = 'match',
  REHEARSAL = 'rehearsal',
  CARAVAN = 'caravan',
  MEETING = 'meeting',
  OTHER = 'other',
}

export enum VotingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum DocumentCategory {
  CONSTITUTION = 'constitution',
  POLICIES = 'policies',
  LEGAL = 'legal',
  TAX = 'tax',
  TRANSPARENCY = 'transparency',
  OTHER = 'other',
}

export enum InventoryType {
  FLAG = 'flag',
  INSTRUMENT = 'instrument',
  BANNER = 'banner',
  OTHER = 'other',
}

export enum ConditionStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  photo_url: string | null;
  /** Ruta en Storage (bucket fan-verification) para validar hincha de Inter Bogotá. */
  fan_verification_storage_path: string | null;
  member_id: string;
  join_date: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberProfile {
  id: string;
  user_id: string;
  bio: string | null;
  position: string | null;
  seniority_level: number;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MembershipCard {
  user_id: string;
  member_id: string;
  full_name: string;
  photo_url: string | null;
  join_date: string;
  role: UserRole;
  qr_data: string;
}

export interface BarraGalleryItem {
  id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface Chant {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string | null;
  video_url: string | null;
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'approved' | 'pending' | 'rejected';
}

export interface FlagInventory {
  id: string;
  name: string;
  type: InventoryType;
  photo_url: string | null;
  dimensions: string | null;
  manufacturer: string | null;
  condition: ConditionStatus;
  owner: string | null;
  acquisition_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VoteOption {
  id: string;
  label: string;
  vote_count: number;
  percentage: number;
}

export interface VotingPoll {
  id: string;
  title: string;
  description: string | null;
  type: 'multiple_choice' | 'yes_no';
  options: VoteOption[];
  start_date: string;
  end_date: string;
  quorum_required: number;
  total_votes: number;
  total_members: number;
  status: VotingStatus;
  created_by: string;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_option: string;
  voted_at: string;
}

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  file_url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  is_public: boolean;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  status: 'attending' | 'not_attending' | 'maybe';
  confirmed_at: string | null;
}

export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
  author: User;
}

export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: User;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
