"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  UserPlus, UserCheck, UserX, MessageCircle, Search, Users, Clock, Check, PhoneCall,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFriends } from "@/hooks/use-friends"
import { useFriendStore } from "@/store/friend-store"
import type { Profile } from "@/types"

interface MembersClientProps {
  currentUserId: string
  allProfiles: Profile[]
}

export function MembersClient({ currentUserId, allProfiles }: MembersClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // Load & subscribe to friend data
  useFriends(currentUserId)
  const { friendRequests, sentRequests, friendships } = useFriendStore()

  const friendIds = new Set(
    friendships.map((f) => (f.user_a === currentUserId ? f.user_b : f.user_a))
  )
  const sentToIds = new Set(sentRequests.map((r) => r.receiver_id))
  const pendingFromIds = new Set(friendRequests.map((r) => r.sender_id))

  const otherProfiles = allProfiles.filter((p) => p.id !== currentUserId)
  const filtered = otherProfiles.filter(
    (p) =>
      !searchQuery ||
      p.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function sendRequest(receiverId: string) {
    setLoadingIds((s) => new Set(s).add(receiverId))
    await fetch("/api/friends/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId }),
    })
    setLoadingIds((s) => { const n = new Set(s); n.delete(receiverId); return n })
    router.refresh()
  }

  async function openDirectConversation(targetUserId: string, startCall = false) {
    setLoadingIds((s) => new Set(s).add(`${startCall ? "call" : "dm"}:${targetUserId}`))
    try {
      const res = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Failed to start conversation:", body?.error || "Unknown error")
        return
      }
      const conversationId = body?.conversationId as string | undefined
      if (conversationId) {
        router.push(`/dashboard/messages?conversation=${conversationId}${startCall ? "&call=1" : ""}`)
      } else {
        router.push(`/dashboard/messages${startCall ? "?call=1" : ""}`)
      }
    } finally {
      setLoadingIds((s) => {
        const n = new Set(s)
        n.delete(`${startCall ? "call" : "dm"}:${targetUserId}`)
        return n
      })
    }
  }

  async function acceptRequest(requestId: string) {
    setLoadingIds((s) => new Set(s).add(requestId))
    await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    })
    setLoadingIds((s) => { const n = new Set(s); n.delete(requestId); return n })
    router.refresh()
  }

  async function declineRequest(requestId: string) {
    setLoadingIds((s) => new Set(s).add(requestId))
    await fetch("/api/friends/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    })
    setLoadingIds((s) => { const n = new Set(s); n.delete(requestId); return n })
    router.refresh()
  }

  function getFriendProfile(id: string) {
    return allProfiles.find((p) => p.id === id)
  }

  function getStatusForUser(userId: string): "friend" | "sent" | "pending" | "none" {
    if (friendIds.has(userId)) return "friend"
    if (sentToIds.has(userId)) return "sent"
    if (pendingFromIds.has(userId)) return "pending"
    return "none"
  }

  return (
    <TooltipProvider>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground">Manage your friends and friend requests</p>
        </div>

        <Tabs defaultValue="all">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="all">All Members</TabsTrigger>
              <TabsTrigger value="friends">
                Friends
                {friendships.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">{friendships.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {friendRequests.length > 0 && (
                  <Badge className="ml-2 text-xs px-1.5 py-0 bg-primary">{friendRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* All Members tab */}
          <TabsContent value="all">
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No members found" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((member) => {
                  const status = getStatusForUser(member.id)
                  const isLoading = loadingIds.has(member.id)
                  const isDmLoading = loadingIds.has(`dm:${member.id}`)
                  const isCallLoading = loadingIds.has(`call:${member.id}`)
                  const pendingRequest = friendRequests.find((r) => r.sender_id === member.id)

                  return (
                    <Card key={member.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold">
                              {member.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className={cn(
                              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                              member.is_online ? "bg-green-500" : "bg-muted-foreground/30"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{member.display_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.is_online ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 mb-3 line-clamp-2 min-h-[2rem]">
                          {member.status || "No status set"}
                        </p>

                        <div className="flex gap-2">
                          {status === "friend" && (
                            <>
                              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={isDmLoading}
                                onClick={() => openDirectConversation(member.id, false)}>
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Message
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs px-2" disabled={isCallLoading}
                                onClick={() => openDirectConversation(member.id, true)}>
                                <PhoneCall className="w-3.5 h-3.5" />
                              </Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs px-2" disabled>
                                    <UserCheck className="w-3.5 h-3.5 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Friends</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {status === "sent" && (
                            <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                              <Clock className="w-3.5 h-3.5 mr-1.5" />Pending
                            </Button>
                          )}
                          {status === "pending" && pendingRequest && (
                            <>
                              <Button size="sm" className="flex-1 text-xs"
                                disabled={isLoading}
                                onClick={() => acceptRequest(pendingRequest.id)}>
                                <Check className="w-3.5 h-3.5 mr-1.5" />Accept
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs px-2"
                                disabled={isLoading}
                                onClick={() => declineRequest(pendingRequest.id)}>
                                <UserX className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {status === "none" && (
                            <>
                              <Button variant="outline" size="sm" className="flex-1 text-xs"
                                disabled={isDmLoading}
                                onClick={() => openDirectConversation(member.id, false)}>
                                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Message
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs px-2"
                                disabled={isCallLoading}
                                onClick={() => openDirectConversation(member.id, true)}>
                                <PhoneCall className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" className="flex-1 text-xs"
                                disabled={isLoading}
                                onClick={() => sendRequest(member.id)}>
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Friend
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Friends tab */}
          <TabsContent value="friends">
            {friendships.length === 0 ? (
              <EmptyState icon={UserCheck} title="No friends yet" description="Add members as friends to see them here" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {friendships.map((f) => {
                  const friendId = f.user_a === currentUserId ? f.user_b : f.user_a
                  const friend = getFriendProfile(friendId)
                  if (!friend) return null
                  return (
                    <Card key={f.user_a + f.user_b} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold">
                              {friend.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className={cn(
                              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                              friend.is_online ? "bg-green-500" : "bg-muted-foreground/30"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{friend.display_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {friend.is_online ? "Online" : "Offline"}
                            </p>
                          </div>
                          <UserCheck className="w-4 h-4 text-green-600 shrink-0" />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 text-xs"
                            onClick={() => openDirectConversation(friend.id, false)}>
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Message
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs px-3"
                            onClick={() => openDirectConversation(friend.id, true)}>
                            <PhoneCall className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Requests tab */}
          <TabsContent value="requests">
            <div className="space-y-6">
              {/* Incoming */}
              {friendRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Incoming Requests ({friendRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {friendRequests.map((req) => {
                      const sender = getFriendProfile(req.sender_id)
                      if (!sender) return null
                      const isLoading = loadingIds.has(req.id)
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                            {sender.display_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{sender.display_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" disabled={isLoading} onClick={() => acceptRequest(req.id)}>
                              <Check className="w-3.5 h-3.5 mr-1.5" />Accept
                            </Button>
                            <Button variant="outline" size="sm" disabled={isLoading} onClick={() => declineRequest(req.id)}>
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sent */}
              {sentRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Sent Requests ({sentRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {sentRequests.map((req) => {
                      const receiver = getFriendProfile(req.receiver_id)
                      if (!receiver) return null
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                            {receiver.display_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{receiver.display_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">Request pending</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Clock className="w-3 h-3 mr-1" />Pending
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {friendRequests.length === 0 && sentRequests.length === 0 && (
                <EmptyState icon={UserPlus} title="No pending requests" description="Send friend requests from the All Members tab" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  )
}
