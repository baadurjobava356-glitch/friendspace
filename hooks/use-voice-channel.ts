"use client"

import { useRef, useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useVoiceStore } from "@/store/voice-store"
import type { VoiceChannel, VoiceParticipant } from "@/types"

// BUG FIX: Added TURN server support for NAT traversal
// Set NEXT_PUBLIC_TURN_ENABLED=true and provide credentials via /api/turn-credentials
async function getRTCConfig(): Promise<RTCConfiguration> {
  const base: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  }
  if (process.env.NEXT_PUBLIC_TURN_ENABLED !== "true") return base
  try {
    const res = await fetch("/api/turn-credentials")
    if (!res.ok) return base
    const { iceServers } = await res.json()
    return { iceServers: [...base.iceServers!, ...iceServers] }
  } catch {
    return base
  }
}

export function useVoiceChannel(currentUserId: string, getDisplayName: (id: string) => string) {
  const supabase = createClient()
  const store = useVoiceStore()

  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({})
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({})
  const remoteAudioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [screenShareVersion, setScreenShareVersion] = useState(0)

  function createPeerConnection(remoteUserId: string, rtcConfig: RTCConfiguration): RTCPeerConnection {
    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionsRef.current[remoteUserId] = pc

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!))
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, screenStreamRef.current!))
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { from: currentUserId, to: remoteUserId, candidate },
        })
      }
    }

    const remoteStream = new MediaStream()
    pc.ontrack = ({ track }) => {
      remoteStream.addTrack(track)
      remoteStreamsRef.current[remoteUserId] = remoteStream
      if (track.kind === "video") {
        setScreenShareVersion((v) => v + 1)
      }
      track.onended = () => {
        setScreenShareVersion((v) => v + 1)
      }
      // Attach audio
      if (!remoteAudioRefs.current[remoteUserId]) {
        const audio = new Audio()
        audio.srcObject = remoteStream
        audio.autoplay = true
        remoteAudioRefs.current[remoteUserId] = audio
      }
    }

    return pc
  }

  async function sendOffer(remoteUserId: string, rtcConfig: RTCConfiguration) {
    const pc = createPeerConnection(remoteUserId, rtcConfig)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    channelRef.current?.send({
      type: "broadcast",
      event: "offer",
      payload: { from: currentUserId, to: remoteUserId, offer },
    })
  }

  const joinVoiceChannel = useCallback(async (channel: VoiceChannel) => {
    if (store.activeChannel?.id === channel.id) return
    if (store.activeChannel) await leaveVoiceChannel()

    store.setConnecting(true)
    const rtcConfig = await getRTCConfig()

    let muted = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
    } catch {
      muted = true
    }

    const ch = supabase.channel(`voice:${channel.id}`, {
      config: { presence: { key: currentUserId } },
    })
    channelRef.current = ch

    const myPresence: VoiceParticipant = {
      userId: currentUserId,
      displayName: getDisplayName(currentUserId),
      isMuted: muted,
      isSpeaking: false,
    }

    // BUG FIX: Presence deduplication — take first entry per key, not flat()
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<VoiceParticipant>()
      const participants = Object.values(state).map((arr) => arr[0])
      store.setParticipants(participants)
    })

    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      newPresences.forEach((presence) => {
        const p = presence as unknown as VoiceParticipant
        if (p.userId !== currentUserId) sendOffer(p.userId, rtcConfig)
      })
    })

    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      leftPresences.forEach((presence) => {
        const p = presence as unknown as VoiceParticipant
        peerConnectionsRef.current[p.userId]?.close()
        delete peerConnectionsRef.current[p.userId]
        delete remoteStreamsRef.current[p.userId]
        const audio = remoteAudioRefs.current[p.userId]
        if (audio) { audio.srcObject = null; delete remoteAudioRefs.current[p.userId] }
        setScreenShareVersion((v) => v + 1)
      })
    })

    ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.to !== currentUserId) return
      const pc = createPeerConnection(payload.from, rtcConfig)
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      ch.send({ type: "broadcast", event: "answer", payload: { from: currentUserId, to: payload.from, answer } })
    })

    ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.to !== currentUserId) return
      const pc = peerConnectionsRef.current[payload.from]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
    })

    ch.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.to !== currentUserId) return
      const pc = peerConnectionsRef.current[payload.from]
      if (pc && payload.candidate) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
    })

    await ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track(myPresence)
    })

    store.setActiveChannel(channel)
    store.setMuted(muted)
    store.setConnecting(false)
  }, [currentUserId, store])

  const leaveVoiceChannel = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null

    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close())
    peerConnectionsRef.current = {}

    Object.values(remoteAudioRefs.current).forEach((a) => { a.srcObject = null })
    remoteAudioRefs.current = {}
    remoteStreamsRef.current = {}
    setScreenShareVersion((v) => v + 1)

    if (channelRef.current) {
      await channelRef.current.untrack()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    store.reset()
  }, [store])

  // BUG FIX: track.enabled = !isMuted (was inverted: track.enabled = isMuted)
  const toggleMute = useCallback(() => {
    const next = !store.isMuted
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0]
      if (track) track.enabled = !next // enabled when NOT muted
    }
    store.setMuted(next)
    channelRef.current?.track({
      userId: currentUserId,
      displayName: getDisplayName(currentUserId),
      isMuted: next,
      isSpeaking: false,
      isSharingScreen: store.isSharingScreen,
    } as VoiceParticipant)
  }, [store, currentUserId, getDisplayName])

  const toggleDeafen = useCallback(() => {
    const next = !store.isDeafened
    store.setDeafened(next)
    Object.values(remoteAudioRefs.current).forEach((a) => { a.muted = next })
  }, [store])

  const toggleScreenShare = useCallback(async () => {
    if (store.isSharingScreen) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        pc.getSenders().filter((s) => s.track?.kind === "video").forEach((s) => pc.removeTrack(s))
      })
      store.setSharingScreen(false)
      setScreenShareVersion((v) => v + 1)
      channelRef.current?.track({
        userId: currentUserId,
        displayName: getDisplayName(currentUserId),
        isMuted: store.isMuted,
        isSpeaking: false,
        isSharingScreen: false,
      } as VoiceParticipant)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        screenStreamRef.current = screenStream
        const videoTrack = screenStream.getVideoTracks()[0]

        for (const [remoteUserId, pc] of Object.entries(peerConnectionsRef.current)) {
          pc.addTrack(videoTrack, screenStream)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channelRef.current?.send({
            type: "broadcast",
            event: "offer",
            payload: { from: currentUserId, to: remoteUserId, offer },
          })
        }

        videoTrack.onended = () => {
          store.setSharingScreen(false)
          screenStreamRef.current = null
          setScreenShareVersion((v) => v + 1)
        }

        store.setSharingScreen(true)
        setScreenShareVersion((v) => v + 1)
        channelRef.current?.track({
          userId: currentUserId,
          displayName: getDisplayName(currentUserId),
          isMuted: store.isMuted,
          isSpeaking: false,
          isSharingScreen: true,
        } as VoiceParticipant)
      } catch {
        // user cancelled
      }
    }
  }, [store, currentUserId, getDisplayName])

  function getRemoteScreenStream(userId: string) {
    return remoteStreamsRef.current[userId] ?? null
  }

  function getLocalScreenStream() {
    return screenStreamRef.current
  }

  return {
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    getRemoteScreenStream,
    getLocalScreenStream,
    screenShareVersion,
  }
}
