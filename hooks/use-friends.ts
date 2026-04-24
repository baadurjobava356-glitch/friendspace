"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useFriendStore } from "@/store/friend-store"
import type { FriendRequest } from "@/types"

export function useFriends(currentUserId: string) {
  const supabase = createClient()
  const store = useFriendStore()

  useEffect(() => {
    if (!currentUserId) return

    async function loadData() {
      const [{ data: incoming }, { data: sent }, { data: friends }] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("*, sender:profiles!friend_requests_sender_id_fkey(*)")
          .eq("receiver_id", currentUserId)
          .eq("status", "pending"),
        supabase
          .from("friend_requests")
          .select("*, receiver:profiles!friend_requests_receiver_id_fkey(*)")
          .eq("sender_id", currentUserId)
          .eq("status", "pending"),
        supabase
          .from("friendships")
          .select("*, friend:profiles!friendships_user_b_fkey(*)")
          .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`),
      ])
      store.setFriendRequests((incoming || []) as FriendRequest[])
      store.setSentRequests((sent || []) as FriendRequest[])
      store.setFriendships(friends || [])
    }

    loadData()

    const channel = supabase
      .channel(`friend-requests:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships" },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])
}
