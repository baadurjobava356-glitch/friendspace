"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useConversationStore } from "@/store/conversation-store"
import type { Message } from "@/types"

export function useRealtimeMessages(conversationId: string | undefined, _currentUserId: string) {
  const store = useConversationStore()
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return

    let isCancelled = false
    const activeConversationId = conversationId

    async function syncMessages() {
      try {
        const response = await fetch(
          `/api/conversations/messages?conversationId=${encodeURIComponent(activeConversationId)}`,
        )
        if (!response.ok) {
          return
        }
        const json = await response.json().catch(() => null) as { messages?: Message[] } | null
        if (isCancelled) return
        const nextMessages = json?.messages ?? []
        store.setMessages(nextMessages)
      } catch {
      }
    }

    void syncMessages()
    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          void syncMessages()
        },
      )
      .subscribe()

    const typingTimeouts = typingTimeoutsRef.current
    return () => {
      isCancelled = true
      void supabase.removeChannel(channel)
      Object.values(typingTimeouts).forEach(clearTimeout)
    }
  }, [conversationId, store, supabase])

  function broadcastTyping(typing: boolean) {
    // Typing status display has been disabled in the UI.
    void typing
    void conversationId
  }

  return { broadcastTyping }
}
