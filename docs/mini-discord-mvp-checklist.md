# Mini Discord MVP Test and Ops Checklist

## Functional checks
- Sign up and log in.
- Create a group.
- Generate invite and join from another account.
- Open text channel and exchange messages.
- Verify online count updates within 5-10 seconds.
- Request signed upload URL and verify upload + attachment registration.
- Request LiveKit token and join voice room.
- Start and stop browser screen share.

## Cost controls
- Enforce max file size via `MINI_DISCORD_MAX_FILE_BYTES`.
- Enforce per-group storage cap via `MINI_DISCORD_MAX_STORAGE_PER_GROUP_BYTES`.
- Keep default voice participant cap at `MINI_DISCORD_MAX_VOICE_PARTICIPANTS`.
- Disable recording and long retention by default.

## Reliability checks
- Verify unauthorized API calls return 401/403.
- Verify non-member cannot list channels/messages for another group.
- Validate expired invite code cannot be used.
- Validate invite usage cap is enforced.

## Suggested monitoring
- Capture API errors for `groups/create`, `invites/join`, `channels/messages`, `files/signed-upload`, and `voice/livekit-token`.
- Track uploads denied by quota/size/type.
- Track voice token requests and failures by reason (missing env, auth, limits).
