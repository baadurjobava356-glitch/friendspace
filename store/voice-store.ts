import { create } from "zustand"
import type { VoiceChannel, VoiceParticipant } from "@/types"

interface VoiceState {
  activeChannel: VoiceChannel | null
  participants: VoiceParticipant[]
  isMuted: boolean
  isDeafened: boolean
  isSharingScreen: boolean
  isConnecting: boolean
  setActiveChannel: (channel: VoiceChannel | null) => void
  setParticipants: (participants: VoiceParticipant[]) => void
  setMuted: (muted: boolean) => void
  setDeafened: (deafened: boolean) => void
  setSharingScreen: (sharing: boolean) => void
  setConnecting: (connecting: boolean) => void
  reset: () => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannel: null,
  participants: [],
  isMuted: false,
  isDeafened: false,
  isSharingScreen: false,
  isConnecting: false,
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setParticipants: (participants) => set({ participants }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setSharingScreen: (isSharingScreen) => set({ isSharingScreen }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  reset: () =>
    set({
      activeChannel: null,
      participants: [],
      isMuted: false,
      isDeafened: false,
      isSharingScreen: false,
      isConnecting: false,
    }),
}))
