export interface User {
  id: string
  email: string
  username: string
  name: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export interface UserLocation {
  user_id: string
  lat: number
  lon: number
  updated_at: string
  name?: string
  avatar_url?: string
}

export interface Point {
  id: string
  created_by: string
  category: string
  name: string
  description: string
  lat: number
  lon: number
  address: string
  phone: string
  website: string
  hours: string
  photos: string[]
  /** Aggregates over point reviews, computed server-side. 0 / 0 when no reviews. */
  avg_rating: number
  review_count: number
  created_at: string
  updated_at: string
}

export interface PointReview {
  id: string
  point_id: string
  user_id: string
  rating: number
  text: string
  photos: string[]
  created_at: string
  updated_at: string
  // Author profile, joined server-side.
  name: string
  username: string
  avatar_url: string
}

export type ChatType = 'direct' | 'group'

export interface ChatMember {
  user_id: string
  name: string
  username: string
  avatar_url: string
  role: string
  /** This member has read every message up to this timestamp (null = none yet). */
  last_read_at?: string | null
}

export interface Chat {
  id: string
  type: ChatType
  title: string
  avatar_url: string
  created_by: string
  created_at: string
  members: ChatMember[]
  last_message?: Message
  /** Messages from others newer than my read cursor. */
  unread_count?: number
}

export interface Contact {
  id: string
  contact_user_id: string
  username: string
  name: string
  avatar_url: string
  alias: string
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type?: string
  attachment_url?: string
  attachment_meta?: Record<string, any>
  created_at: string
  edited_at?: string
}

export interface UploadResponse {
  url: string
  filename: string
  mime_type: string
  size: number
  message_type: string
}

export type ServiceStatus = 'ok' | 'soon' | 'overdue' | 'untracked'

export interface ServiceItem {
  id: string
  vehicle_id: string
  kind: string
  title: string
  interval_km: number
  last_service_mileage: number
  last_service_at: string | null
  times_done: number
  // Computed on the server, recalculated on every read:
  remaining_km: number
  status: ServiceStatus
}

export interface Vehicle {
  id: string
  user_id?: string
  make: string
  model: string
  year: number
  color: string
  notes: string
  photos: string[]
  mileage: number
  service_items: ServiceItem[]
  created_at: string
}

export type EventType = 'meeting' | 'trip' | 'photosession'
export type EventVisibility = 'public' | 'private'
export type ParticipantStatus = 'pending' | 'accepted' | 'declined'
export type ParticipantRole = 'owner' | 'participant'

export interface Destination {
  lat: number
  lon: number
  address: string
}

export interface EventDetails {
  destination?: Destination
}

// Named RideEvent to avoid clashing with the DOM `Event` global.
export interface RideEvent {
  id: string
  owner_id: string
  type: EventType
  title: string
  description: string
  starts_at: string
  visibility: EventVisibility
  details: EventDetails
  photos: string[]
  created_at: string
  updated_at: string
}

export interface EventParticipant {
  user_id: string
  name: string
  username: string
  avatar_url: string
  role: ParticipantRole
  status: ParticipantStatus
}

export interface EventItem extends RideEvent {
  participants: EventParticipant[]
  my_status?: ParticipantStatus
}

// A single ordered waypoint of a Route. `point_id` is set when the waypoint was
// added from the POI database (a soft reference — the route keeps its own copy of
// lat/lon/name/address, so a later-deleted POI never breaks the route).
export interface RoutePoint {
  lat: number
  lon: number
  name: string
  address?: string
  point_id?: string
}

// A saved ride: an ordered list of up to 10 waypoints. `distance_m`/`duration_s`
// are computed client-side via ORS and echoed back on read. `is_suggested` marks
// curated recommendation routes (server-only flag).
export interface Route {
  id: string
  owner_id: string
  name: string
  description: string
  points: RoutePoint[]
  distance_m: number
  duration_s: number
  is_suggested: boolean
  created_at: string
  updated_at: string
}
