"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useConversationStore } from "@/store/conversation-store"
import type { Message } from "@/types"

export function useRealtimeMessages(conversationId: string | undefined, _currentUserId: string) {
  const store = useConversationStore()
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = createClient()
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const oldestTimestampRef = useRef<string | null>(null)
  const activeConversationIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!conversationId) return

    let isCancelled = false
    const activeConversationId = conversationId
    activeConversationIdRef.current = activeConversationId
    oldestTimestampRef.current = null
    setHasOlderMessages(true)

    async function syncMessages() {
      try {
        const response = await fetch(
          `/api/conversations/messages?conversationId=${encodeURIComponent(activeConversationId)}&limit=100`,
        )
        if (!response.ok) {
          return
        }
        const json = await response.json().catch(() => null) as { messages?: Message[] } | null
        if (isCancelled) return
        const nextMessages = json?.messages ?? []
        store.setMessages(nextMessages)
        oldestTimestampRef.current = nextMessages[0]?.created_at ?? null
        setHasOlderMessages(nextMessages.length >= 100)
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

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationIdRef.current || !oldestTimestampRef.current || isLoadingOlder || !hasOlderMessages) {
      return
    }
    setIsLoadingOlder(true)
    try {
      const response = await fetch(
        `/api/conversations/messages?conversationId=${encodeURIComponent(activeConversationIdRef.current)}&before=${encodeURIComponent(oldestTimestampRef.current)}&limit=50`,
      )
      if (!response.ok) return
      const json = await response.json().catch(() => null) as { messages?: Message[] } | null
      const older = json?.messages ?? []
      if (older.length > 0) {
        store.prependMessages(older)
        oldestTimestampRef.current = older[0]?.created_at ?? oldestTimestampRef.current
      }
      if (older.length < 50) {
        setHasOlderMessages(false)
      }
    } finally {
      setIsLoadingOlder(false)
    }
  }, [hasOlderMessages, isLoadingOlder, store])

  return { broadcastTyping, loadOlderMessages, hasOlderMessages, isLoadingOlder }
}
