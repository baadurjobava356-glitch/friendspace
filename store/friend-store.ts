import { create } from "zustand"
import type { FriendRequest, Friendship } from "@/types"

interface FriendState {
  friendRequests: FriendRequest[]
  sentRequests: FriendRequest[]
  friendships: Friendship[]
  setFriendRequests: (requests: FriendRequest[]) => void
  setSentRequests: (requests: FriendRequest[]) => void
  setFriendships: (friendships: Friendship[]) => void
  addFriendRequest: (request: FriendRequest) => void
  removeFriendRequest: (id: string) => void
  addFriendship: (friendship: Friendship) => void
}

export const useFriendStore = create<FriendState>((set) => ({
  friendRequests: [],
  sentRequests: [],
  friendships: [],
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setSentRequests: (sentRequests) => set({ sentRequests }),
  setFriendships: (friendships) => set({ friendships }),
  addFriendRequest: (request) =>
    set((s) => ({ friendRequests: [...s.friendRequests, request] })),
  removeFriendRequest: (id) =>
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.id !== id),
      sentRequests: s.sentRequests.filter((r) => r.id !== id),
    })),
  addFriendship: (friendship) =>
    set((s) => ({ friendships: [...s.friendships, friendship] })),
}))
