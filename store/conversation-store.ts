import { create } from "zustand"
import type { Conversation, Message } from "@/types"

interface ConversationState {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  messages: Message[]
  isTyping: Record<string, boolean>
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  setSelectedConversation: (conversation: Conversation | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  replaceOptimisticMessage: (tempId: string, message: Message) => void
  removeMessage: (id: string) => void
  setTyping: (userId: string, typing: boolean) => void
  updateConversationTimestamp: (id: string) => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  isTyping: {},
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((s) => ({ conversations: [conversation, ...s.conversations] })),
  setSelectedConversation: (conversation) =>
    set({ selectedConversation: conversation, messages: [], isTyping: {} }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({
      messages: s.messages.find((m) => m.id === message.id)
        ? s.messages
        : [...s.messages, message],
    })),
  replaceOptimisticMessage: (tempId, message) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === tempId ? message : m)),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  setTyping: (userId, typing) =>
    set((s) => ({ isTyping: { ...s.isTyping, [userId]: typing } })),
  updateConversationTimestamp: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, updated_at: new Date().toISOString() } : c
      ),
    })),
}))
