# Friendspace — Fix Changelog

## Issues Fixed

---

### 1. Real-time messaging (`messages-client.tsx`)

**Problem:** Messages were written to Supabase but the receiving user's UI never updated.

**Fix:** Added a `postgres_changes` subscription on the `messages` table filtered by `conversation_id`. When any client inserts a new row, all subscribers receive the payload and `setMessages` is called immediately — no reload needed.

```ts
.on("postgres_changes", {
  event: "INSERT", schema: "public", table: "messages",
  filter: `conversation_id=eq.${selectedConversation.id}`,
}, (payload) => { ... })
```

---

### 2. Voice calls — real WebRTC peer-to-peer audio (`messages-client.tsx`)

**Problem:** `joinVoiceChannel` acquired a microphone stream but never created any `RTCPeerConnection`. Audio was never transmitted between users.

**Fix:** Full WebRTC signaling via Supabase Realtime broadcast:

- **Offer/Answer flow:** When a new peer joins, the existing client creates an `RTCPeerConnection`, generates an `offer`, and broadcasts it. The joiner receives it, sets the remote description, creates an `answer`, and sends it back.
- **ICE candidates:** Each side's `onicecandidate` handler broadcasts candidates to the peer via the same channel.
- **Remote audio:** `pc.ontrack` collects incoming tracks into a `MediaStream` and plays them through a dynamically created `<audio>` element.
- **Cleanup:** `leaveVoiceChannel` closes all `RTCPeerConnection`s, stops all tracks, and calls `supabase.removeChannel`.

---

### 3. Voice participants — real presence, not simulation (`messages-client.tsx`)

**Problem:** `voiceParticipants` was populated by fake `setTimeout` calls that injected random online users after 1.5–3 s.

**Fix:** Replaced with Supabase Realtime **Presence**:

```ts
const ch = supabase.channel(`voice:${channel.id}`, {
  config: { presence: { key: currentUserId } },
})
ch.on("presence", { event: "sync" }, () => {
  const state = ch.presenceState<VoiceParticipant>()
  setVoiceParticipants(Object.values(state).flat())
})
await ch.track(myPresence) // sends our state to all channel members
```

Each participant tracks their own `{ userId, displayName, isMuted, isSpeaking, isSharingScreen }`. When anyone joins or leaves, all subscribers' participant lists update automatically.

---

### 4. Screen sharing (`messages-client.tsx`)

**Problem:** No `getDisplayMedia()` call existed anywhere in the codebase. The feature was completely absent.

**Fix:** Added `toggleScreenShare()`:

1. Calls `navigator.mediaDevices.getDisplayMedia({ video: true })`.
2. Adds the video track to every existing `RTCPeerConnection` via `pc.addTrack()`.
3. Renegotiates each connection by creating a new offer and broadcasting it.
4. Listens for `videoTrack.onended` (user clicks "Stop sharing" in the browser chrome) and cleans up automatically.
5. Updates presence so the participants panel shows "Sharing screen" next to the user.

A **Screen Share** button (Monitor icon) was added to the voice controls bar.

---

### 5. File upload — missing `BLOB_READ_WRITE_TOKEN` (`app/api/upload/route.ts`)

**Problem:** `@vercel/blob`'s `put()` throws when `BLOB_READ_WRITE_TOKEN` is not set. The error was caught and logged to console only — the client received a 500 with no actionable message.

**Fix:**
- Added an explicit token check at the top of the route. If missing, returns `503` with a clear error string.
- Error from `put()` is now forwarded in the JSON response body.

---

### 6. File upload — no visible feedback (`components/dashboard/files/files-client.tsx`)

**Problem:** The `catch` block only called `console.error`. The UI showed no error state, no success confirmation, and no indication of what failed.

**Fix:** Added an `uploadFeedback` state (`{ status, message }`) with a banner that appears above the upload zone:

- **Uploading:** spinner + "Uploading N files…"
- **Success:** green check + "N files uploaded successfully"
- **Partial/full failure:** red X + first error message (e.g. "File storage is not configured")

The banner auto-dismisses after 4 s. Non-`ok` HTTP responses are now parsed and their `error` field is surfaced to the user.

---

### 7. `.env.example` — documented `BLOB_READ_WRITE_TOKEN`

The token was completely absent from the example config. Added it with step-by-step instructions for obtaining it from the Vercel dashboard.
