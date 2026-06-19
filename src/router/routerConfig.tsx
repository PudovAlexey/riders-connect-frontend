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
import RoutesPage from '../pages/RoutesPage'
import RouteDetailPage from '../pages/RouteDetailPage'
import RouteBuilderPage from '../pages/RouteBuilderPage'

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
          { path: 'routes', Component: RoutesPage },
          { path: 'routes/:routeId', Component: RouteDetailPage },
          { path: 'chat', Component: ChatListPage },
          { path: 'chat/new', Component: NewChatPage },
          { path: 'contacts', Component: ContactsPage },
        ],
      },

      // The conversation view is full-screen: it owns its own composer at the
      // bottom, so it lives OUTSIDE the BottomNav layout (no tab bar, no bottom
      // padding) — otherwise the fixed nav covers the message input.
      { path: 'chat/:chatId', Component: ChatRoomPage },

      // The route builder is full-screen (large interactive map + its own save
      // bar), so it lives OUTSIDE the BottomNav layout, like the chat room.
      { path: 'routes/new', Component: RouteBuilderPage },
      { path: 'routes/:routeId/edit', Component: RouteBuilderPage },

      // Fallback — unknown paths go back to the map
      { path: '*', element: <Navigate to="/map" replace /> },
    ],
  },
])

export default routerConfig
