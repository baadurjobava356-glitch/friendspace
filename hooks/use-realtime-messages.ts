"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useConversationStore } from "@/store/conversation-store"
import type { Message } from "@/types"

export function useRealtimeMessages(conversationId: string | undefined, currentUserId: string) {
  const supabase = createClient()
  const store = useConversationStore()
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!conversationId) return

    // Load messages
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => store.setMessages(data || []))

    // Mark as read
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          store.addMessage(msg)
          supabase
            .from("conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", currentUserId)
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload as { userId: string; isTyping: boolean }
        if (userId === currentUserId) return
        store.setTyping(userId, isTyping)
        if (isTyping) {
          if (typingTimeoutsRef.current[userId]) clearTimeout(typingTimeoutsRef.current[userId])
          typingTimeoutsRef.current[userId] = setTimeout(() => store.setTyping(userId, false), 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout)
    }
  }, [conversationId])

  function broadcastTyping(typing: boolean) {
    if (!conversationId) return
    const ch = supabase.channel(`messages:${conversationId}`)
    ch.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId, isTyping: typing } })
  }

  return { broadcastTyping }
}
