import { Shield, Lock, Key, Eye, UserCheck, Server } from "lucide-react"

const securityFeatures = [
  {
    icon: Lock,
    title: "DTLS-SRTP Encryption",
    description: "All media streams are encrypted using DTLS-SRTP, ensuring end-to-end security for voice and screen sharing data.",
  },
  {
    icon: Key,
    title: "Token-Based Authentication",
    description: "Short-lived JWT tokens (1-hour expiry) with room-specific permissions tied to authenticated forum users only.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access Control",
    description: "Granular permissions for hosts, moderators, and participants with the ability to mute, kick, or manage rooms.",
  },
  {
    icon: Eye,
    title: "Privacy Controls",
    description: "Waiting rooms, room locks, recording consent notifications, and camera/mic defaults for user privacy.",
  },
  {
    icon: Server,
    title: "Secure Signaling",
    description: "All signaling traffic uses WSS (WebSocket Secure) with TLS 1.3 encryption.",
  },
  {
    icon: Shield,
    title: "Rate Limiting",
    description: "Protection against abuse with rate limiting on room creation and API endpoints.",
  },
]

export function Security() {
  return (
    <section id="security" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left side - Content */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              Enterprise-grade security you can trust
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Built with security-first principles to protect your community&apos;s conversations and data.
            </p>

            <div className="mt-10 space-y-6">
              {securityFeatures.slice(0, 3).map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <feature.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - More features */}
          <div className="rounded-2xl border border-border bg-card/50 p-6 lg:p-8">
            <h3 className="text-lg font-semibold">Additional Security Measures</h3>
            <div className="mt-6 space-y-6">
              {securityFeatures.slice(3).map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <feature.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Security badges */}
            <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
              <div className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium">
                SOC 2 Type II
              </div>
              <div className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium">
                GDPR Compliant
              </div>
              <div className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium">
                HIPAA Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
