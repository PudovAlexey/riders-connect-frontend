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
      // Public routes — only for guests, authed users get bounced to the app
      {
        Component: GuestOnly,
        children: [{ path: 'auth', Component: AuthPage }],
      },

      // Protected routes — require a token, rendered inside the Layout (bottom nav)
      {
        Component: RequireAuth,
        children: [
          {
            Component: Layout,
            children: [
              { index: true, element: <Navigate to="/map" replace /> },
              { path: 'map', Component: MapPage },
              { path: 'chat', Component: ChatListPage },
              { path: 'chat/new', Component: NewChatPage },
              { path: 'chat/:chatId', Component: ChatRoomPage },
              { path: 'contacts', Component: ContactsPage },
              { path: 'profile', Component: ProfilePage },
              { path: 'garage', Component: GaragePage },
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
