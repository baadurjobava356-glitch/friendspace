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
      const [
        { data: incoming, error: incomingError },
        { data: sent, error: sentError },
        { data: friends, error: friendsError },
      ] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("*")
          .eq("receiver_id", currentUserId)
          .eq("status", "pending"),
        supabase
          .from("friend_requests")
          .select("*")
          .eq("sender_id", currentUserId)
          .eq("status", "pending"),
        supabase
          .from("friendships")
          .select("*")
          .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`),
      ])

      if (incomingError || sentError || friendsError) {
        console.warn("Friends data unavailable", {
          incomingError: incomingError?.message,
          sentError: sentError?.message,
          friendsError: friendsError?.message,
        })
      }

      const profileIds = Array.from(
        new Set([
          ...(incoming ?? []).map((r: any) => r.sender_id),
          ...(sent ?? []).map((r: any) => r.receiver_id),
          ...(friends ?? []).flatMap((f: any) => [f.user_a, f.user_b]),
        ].filter(Boolean)),
      )

      const { data: profiles, error: profilesError } =
        profileIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", profileIds)
          : { data: [], error: null as any }

      if (profilesError) {
        console.warn("Friends profiles unavailable", { profilesError: profilesError.message })
      }

      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))
      const incomingWithProfiles = (incoming ?? []).map((req: any) => ({
        ...req,
        sender: profileById.get(req.sender_id) ?? null,
      }))
      const sentWithProfiles = (sent ?? []).map((req: any) => ({
        ...req,
        receiver: profileById.get(req.receiver_id) ?? null,
      }))

      store.setFriendRequests(((incomingWithProfiles as FriendRequest[]) || []))
      store.setSentRequests(((sentWithProfiles as FriendRequest[]) || []))
      store.setFriendships(friends || [])
    }

    loadData()

    const channelName = `friend-requests:${currentUserId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase
      .channel(channelName)
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
