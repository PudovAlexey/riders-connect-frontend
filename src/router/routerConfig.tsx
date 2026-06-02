import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from './RootLayout'
import { RequireAuth, GuestOnly } from './guards'
import Layout from '../components/Layout'
import AuthPage from '../pages/AuthPage'
import MapPage from '../pages/MapPage'
import ChatListPage from '../pages/ChatListPage'
import ChatRoomPage from '../pages/ChatRoomPage'
import NewChatPage from '../pages/NewChatPage'
import ContactsPage from '../pages/ContactsPage'
import ProfilePage from '../pages/ProfilePage'
import GaragePage from '../pages/GaragePage'

export const routerConfig = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      // /auth — only for guests; authed users get bounced back where they came from
      {
        Component: GuestOnly,
        children: [{ path: 'auth', Component: AuthPage }],
      },

      // The app is public — no login required to browse
      {
        Component: Layout,
        children: [
          { index: true, element: <Navigate to="/map" replace /> },
          { path: 'map', Component: MapPage },
          { path: 'profile', Component: ProfilePage },
          // Garage is viewable without auth; creating a vehicle prompts login inside the page
          { path: 'garage', Component: GaragePage },

          // Chat requires auth — entering any chat route redirects guests to /auth
          {
            Component: RequireAuth,
            children: [
              { path: 'chat', Component: ChatListPage },
              { path: 'chat/new', Component: NewChatPage },
              { path: 'chat/:chatId', Component: ChatRoomPage },
              { path: 'contacts', Component: ContactsPage },
            ],
          },
        ],
      },

      // Fallback — unknown paths go back to the map
      { path: '*', element: <Navigate to="/map" replace /> },
    ],
  },
])

export default routerConfig
