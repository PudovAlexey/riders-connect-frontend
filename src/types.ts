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

export type ChatType = 'direct' | 'group'

export interface ChatMember {
  user_id: string
  name: string
  username: string
  avatar_url: string
  role: string
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
}

export interface UploadResponse {
  url: string
  filename: string
  mime_type: string
  size: number
  message_type: string
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
