import axios from 'axios'
import { API_URL } from './lib/config'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Optional callback invoked when the session is rejected (401), so the auth
// layer can reset to a logged-out state instead of leaving stale `user` data
// while every request fails. Registered by AuthProvider.
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn
}

// On 401 the stored token is invalid/expired — drop it and let the app fall
// back to its public/logged-out state. We skip /auth/* so login errors (e.g. a
// wrong code) stay local to the login sheet and don't trigger a global reset.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''
    if (status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('token')
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

export const sendCode = (email: string) =>
  api.post('/auth/send-code', { email })

export const verify = (email: string, code: string) =>
  api.post<{ token: string; user: import('./types').User }>('/auth/verify', { email, code })

export const getMe = () =>
  api.get<import('./types').User>('/profile/me')

export const updateMe = (data: { name?: string; avatar_url?: string; username?: string }) =>
  api.patch<import('./types').User>('/profile/me', data)

export const getUser = (id: string) =>
  api.get<import('./types').User>(`/profile/${id}`)

export const searchUsers = (q: string) =>
  api.get<import('./types').User[]>(`/profile/search?q=${encodeURIComponent(q)}`)

export const getUserByUsername = (username: string) =>
  api.get<import('./types').User>(`/profile/by-username/${encodeURIComponent(username.replace(/^@/, ''))}`)

export const updateLocation = (lat: number, lon: number) =>
  api.put('/geo/location', { lat, lon })

export const getUsersOnMap = () =>
  api.get<import('./types').UserLocation[]>('/geo/users')

export const getPoints = (
  b: { min_lat: number; max_lat: number; min_lon: number; max_lon: number },
  categories?: string[],
) => {
  let url = `/points?min_lat=${b.min_lat}&max_lat=${b.max_lat}&min_lon=${b.min_lon}&max_lon=${b.max_lon}`
  if (categories?.length) url += `&categories=${encodeURIComponent(categories.join(','))}`
  return api.get<import('./types').Point[]>(url)
}

export const getChats = () =>
  api.get<import('./types').Chat[]>('/chat/chats')

export const createDirectChat = (target: { user_id?: string; username?: string }) =>
  api.post<import('./types').Chat>('/chat/chats', target)

export const createGroupChat = (data: { title: string; member_ids: string[] }) =>
  api.post<import('./types').Chat>('/chat/chats', data)

export const addChatMember = (chatId: string, target: { user_id?: string; username?: string }) =>
  api.post<import('./types').Chat>(`/chat/chats/${chatId}/members`, target)

export const getMessages = (chatId: string, limit = 50, offset = 0) =>
  api.get<import('./types').Message[]>(
    `/chat/chats/${chatId}/messages?limit=${limit}&offset=${offset}`,
  )

export const sendMessage = (chatId: string, content: string) =>
  api.post<import('./types').Message>(`/chat/chats/${chatId}/messages`, { content })

export const editMessage = (chatId: string, messageId: string, content: string) =>
  api.patch<import('./types').Message>(`/chat/chats/${chatId}/messages/${messageId}`, { content })

export const deleteMessage = (chatId: string, messageId: string, scope: 'me' | 'all' = 'me') =>
  api.delete(`/chat/chats/${chatId}/messages/${messageId}?scope=${scope}`)

export const uploadMedia = (file: Blob, filename = 'upload') => {
  const form = new FormData()
  form.append('file', file, (file as File).name || filename)
  return api.post<import('./types').UploadResponse>('/media/upload', form)
}

export const getPushPublicKey = () =>
  api.get<{ public_key: string }>('/push/public-key')

export const savePushSubscription = (sub: PushSubscriptionJSON) =>
  api.post('/push/subscription', sub)

export const deletePushSubscription = (endpoint: string) =>
  api.delete('/push/subscription', { data: { endpoint } })

export const getContacts = () =>
  api.get<import('./types').Contact[]>('/contacts/')

export const addContact = (username: string) =>
  api.post<import('./types').Contact[]>('/contacts/', { username: username.replace(/^@/, '') })

export const deleteContact = (id: string) =>
  api.delete(`/contacts/${id}`)

export const getGarage = () =>
  api.get<import('./types').Vehicle[]>('/garage/')

export const addGarageVehicle = (data: Omit<import('./types').Vehicle, 'id' | 'created_at' | 'user_id'>) =>
  api.post<import('./types').Vehicle>('/garage/', data)

export const deleteGarageVehicle = (id: string) =>
  api.delete(`/garage/${id}`)

type EventScope = 'feed' | 'mine' | 'invitations'

export interface CreateEventInput {
  type: import('./types').EventType
  title: string
  description?: string
  starts_at: string
  visibility: import('./types').EventVisibility
  details?: import('./types').EventDetails
  photos?: string[]
  invitee_ids?: string[]
}

export const getEvents = (scope: EventScope = 'feed') =>
  api.get<import('./types').RideEvent[]>(`/events?scope=${scope}`)

export const getEvent = (id: string) =>
  api.get<import('./types').EventItem>(`/events/${id}`)

export const createEvent = (data: CreateEventInput) =>
  api.post<import('./types').RideEvent>('/events', data)

export const updateEvent = (id: string, data: Partial<CreateEventInput>) =>
  api.patch<import('./types').RideEvent>(`/events/${id}`, data)

export const deleteEvent = (id: string) =>
  api.delete(`/events/${id}`)

export const inviteToEvent = (id: string, target: { username?: string; user_id?: string }) =>
  api.post(`/events/${id}/invite`, target)

export const respondToEvent = (id: string, status: 'accepted' | 'declined') =>
  api.post(`/events/${id}/respond`, { status })

export const removeEventParticipant = (id: string, userId: string) =>
  api.delete(`/events/${id}/participants/${userId}`)
