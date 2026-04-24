import { Badge } from "@/components/ui/badge"

const techStack = [
  {
    category: "Media Server",
    name: "LiveKit",
    description: "Open-source WebRTC SFU for scalable real-time communication",
    recommended: true,
  },
  {
    category: "Protocol",
    name: "WebRTC",
    description: "Native browser support, no plugins required",
    recommended: false,
  },
  {
    category: "Audio Codec",
    name: "Opus",
    description: "48kHz sample rate with adaptive bitrate",
    recommended: false,
  },
  {
    category: "Encryption",
    name: "DTLS-SRTP",
    description: "End-to-end media encryption",
    recommended: false,
  },
]

const architectureSteps = [
  {
    step: "01",
    title: "Client Connection",
    description: "Browser connects via WebSocket for signaling and establishes WebRTC peer connections.",
  },
  {
    step: "02",
    title: "SFU Routing",
    description: "Selective Forwarding Unit efficiently routes media between participants without transcoding.",
  },
  {
    step: "03",
    title: "Adaptive Streaming",
    description: "Simulcast layers allow each viewer to receive the optimal quality for their connection.",
  },
  {
    step: "04",
    title: "Forum Sync",
    description: "Real-time events sync with your forum to show active rooms, participants, and notifications.",
  },
]

export function Technology() {
  return (
    <section id="technology" className="border-y border-border bg-card/30 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">
            Technology Stack
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            Built on proven, scalable technology
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            We leverage industry-leading open-source tools to deliver reliable, high-quality real-time communication.
          </p>
        </div>

        {/* Tech Cards */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {techStack.map((tech, index) => (
            <div
              key={index}
              className="relative rounded-xl border border-border bg-card p-5"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {tech.category}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <h3 className="text-xl font-semibold">{tech.name}</h3>
                {tech.recommended && (
                  <Badge className="bg-accent text-accent-foreground">
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tech.description}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture Flow */}
        <div className="mt-20">
          <h3 className="text-center text-xl font-semibold">How it works</h3>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {architectureSteps.map((step, index) => (
              <div key={index} className="relative">
                {index < architectureSteps.length - 1 && (
                  <div className="absolute top-8 left-full hidden h-0.5 w-6 bg-border lg:block" />
                )}
                <div className="flex flex-col">
                  <span className="text-4xl font-bold text-accent/30">{step.step}</span>
                  <h4 className="mt-2 font-semibold">{step.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Preview */}
        <div className="mt-20 overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-destructive/50" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
            <div className="h-3 w-3 rounded-full bg-green-500/50" />
            <span className="ml-2 text-xs text-muted-foreground">room-api.ts</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm">
            <code className="text-muted-foreground">
{`// Create a voice room from your forum thread
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export async function createVoiceRoom(threadId: string, userId: string) {
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  // Create room with 10 participant limit
  await roomService.createRoom({
    name: \`thread-\${threadId}\`,
    maxParticipants: 10,
    metadata: JSON.stringify({ threadId, createdBy: userId })
  });

  // Generate access token for the user
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: '1h'
  });

  token.addGrant({
    room: \`thread-\${threadId}\`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true
  });

  return token.toJwt();
}`}
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}
