import { useEffect } from 'react'
import useWebSocket from 'react-use-websocket'
import { useAuth } from '../hooks/useAuth'
import { buildWsUrl } from '../lib/config'
import { playReceive } from '../lib/sounds'
import type { Message } from '../types'

type WsMsg = { type: string; message?: Message }

/**
 * App-wide listener that plays the "received" sound whenever a new message
 * arrives from someone else — regardless of which page is open. Renders nothing.
 * Shares the single WebSocket connection (share: true) with ChatRoomPage/MapPage.
 */
export default function GlobalSounds() {
  const { user, token } = useAuth()
  const wsUrl = token ? buildWsUrl(`/ws?token=${token}`) : null

  const { lastJsonMessage } = useWebSocket<WsMsg>(wsUrl, {
    shouldReconnect: () => true,
    share: true,
  })

  useEffect(() => {
    if (!lastJsonMessage || lastJsonMessage.type !== 'new_message') return
    const msg = lastJsonMessage.message
    // Ignore our own messages echoed back over the socket — the send sound
    // already fired when we sent them.
    if (!msg || msg.sender_id === user?.id) return
    playReceive()
  }, [lastJsonMessage, user?.id])

  return null
}
