import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from './RootLayout'
import Layout from '../components/Layout'
import MapPage from '../pages/MapPage'
import ChatListPage from '../pages/ChatListPage'
import ChatRoomPage from '../pages/ChatRoomPage'
import NewChatPage from '../pages/NewChatPage'
import ContactsPage from '../pages/ContactsPage'
import ProfilePage from '../pages/ProfilePage'
import ProfileEditPage from '../pages/ProfileEditPage'
import GaragePage from '../pages/GaragePage'
import EventsPage from '../pages/EventsPage'
import EventDetailPage from '../pages/EventDetailPage'

export const routerConfig = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      // The whole app is public — login is a bottom sheet (useAuth().promptLogin()),
      // not a route, and pages prompt for it themselves where an action needs auth.
      {
        Component: Layout,
        children: [
          { index: true, element: <Navigate to="/map" replace /> },
          { path: 'map', Component: MapPage },
          { path: 'profile', Component: ProfilePage },
          { path: 'profile/edit', Component: ProfileEditPage },
          { path: 'garage', Component: GaragePage },
          { path: 'events', Component: EventsPage },
          { path: 'events/:eventId', Component: EventDetailPage },
          { path: 'chat', Component: ChatListPage },
          { path: 'chat/new', Component: NewChatPage },
          { path: 'chat/:chatId', Component: ChatRoomPage },
          { path: 'contacts', Component: ContactsPage },
        ],
      },

      // Fallback — unknown paths go back to the map
      { path: '*', element: <Navigate to="/map" replace /> },
    ],
  },
])

export default routerConfig
