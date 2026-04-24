import { 
  Mic, 
  Monitor, 
  Shield, 
  Zap, 
  Users, 
  Settings,
  Volume2,
  Share2
} from "lucide-react"

const features = [
  {
    icon: Mic,
    title: "Crystal-Clear Audio",
    description: "48kHz Opus codec with noise suppression, echo cancellation, and auto-gain control for studio-quality voice calls.",
  },
  {
    icon: Monitor,
    title: "4K Screen Sharing",
    description: "Share your entire screen, application windows, or browser tabs with adaptive bitrate streaming up to 4K resolution.",
  },
  {
    icon: Users,
    title: "10 Participants",
    description: "Support up to 10 simultaneous participants per room with automatic speaker detection and dominant speaker highlighting.",
  },
  {
    icon: Shield,
    title: "End-to-End Security",
    description: "DTLS-SRTP encryption for all media streams, secure WebSocket signaling, and time-limited TURN credentials.",
  },
  {
    icon: Zap,
    title: "Low Latency",
    description: "WebRTC-powered SFU architecture ensures sub-200ms latency with automatic quality adaptation based on network conditions.",
  },
  {
    icon: Settings,
    title: "Device Controls",
    description: "Easy microphone and speaker selection, volume controls, and real-time audio level visualization for all participants.",
  },
  {
    icon: Volume2,
    title: "Noise Suppression",
    description: "AI-powered background noise removal keeps conversations clear, even in noisy environments.",
  },
  {
    icon: Share2,
    title: "Forum Integration",
    description: "Seamlessly link voice rooms to forum threads with permission inheritance and participant notifications.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            Everything you need for seamless communication
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Built with WebRTC technology for real-time, browser-native voice and screen sharing without any plugins required.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-accent/50 hover:bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
