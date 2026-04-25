"use client"

import { useEffect, useRef } from "react"
import { useConversationStore } from "@/store/conversation-store"
import type { Message } from "@/types"

export function useRealtimeMessages(conversationId: string | undefined, _currentUserId: string) {
  const store = useConversationStore()
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!conversationId) return

    let isCancelled = false
    let previousCount = -1

    async function loadMessages() {
      const response = await fetch(`/api/conversations/messages?conversationId=${encodeURIComponent(conversationId)}`)
      if (!response.ok) return
      const json = await response.json().catch(() => null) as { messages?: Message[] } | null
      if (isCancelled) return
      const nextMessages = json?.messages ?? []
      store.setMessages(nextMessages)
      previousCount = nextMessages.length
    }

    loadMessages()
    const interval = setInterval(async () => {
      const response = await fetch(`/api/conversations/messages?conversationId=${encodeURIComponent(conversationId)}`)
      if (!response.ok) return
      const json = await response.json().catch(() => null) as { messages?: Message[] } | null
      if (isCancelled) return
      const nextMessages = json?.messages ?? []
      if (nextMessages.length !== previousCount) {
        store.setMessages(nextMessages)
        previousCount = nextMessages.length
      }
    }, 2000)

    return () => {
      isCancelled = true
      clearInterval(interval)
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout)
    }
  }, [conversationId, store])

  function broadcastTyping(typing: boolean) {
    // Typing status display has been disabled in the UI.
    void typing
    void conversationId
  }

  return { broadcastTyping }
}
