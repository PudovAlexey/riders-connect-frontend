/**
 * Resolves the actual scroll root inside @chatscope/chat-ui-kit's MessageList.
 * The library wraps content in several nested elements depending on version;
 * try the most specific selector first.
 */
export function findChatScrollNode(messageListId?: string): HTMLElement | null {
  const scoped = (selector: string) => (messageListId ? `#${messageListId} ${selector}` : selector)

  return (document.querySelector(scoped('.cs-message-list__scroll-wrapper')) ||
    document.querySelector(scoped('.scrollbar-container.ps')) ||
    document.querySelector(scoped('.ps')) ||
    document.querySelector(scoped('.cs-message-list')) ||
    document.querySelector('.cs-message-list')) as HTMLElement | null
}

/** Smooth-scrolls the chatscope MessageList to the bottom. */
export function scrollChatToBottom(messageListId?: string) {
  const node = findChatScrollNode(messageListId)
  if (!node) return
  node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
}
