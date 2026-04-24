import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  FolderOpen, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2
} from "lucide-react"

const features = [
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    description: "Chat with your friends instantly with our real-time messaging system. Create group chats or have private conversations.",
  },
  {
    icon: Calendar,
    title: "Event Planning",
    description: "Plan hangouts, parties, and meetups with a shared calendar. RSVP to events and never miss a gathering.",
  },
  {
    icon: FolderOpen,
    title: "File Sharing",
    description: "Share photos, documents, and files with your group. Organize files and access them anytime.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Your data is protected with enterprise-grade security. Only your friends can access your group.",
  },
]

const benefits = [
  "Create unlimited group conversations",
  "Plan and RSVP to events together",
  "Share files securely with your friends",
  "Manage profiles and preferences",
  "Real-time notifications",
  "Works on all devices",
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FriendSpace</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Your private collaboration hub
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Stay connected with your friends
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            FriendSpace brings your friend group together with messaging, shared calendars, 
            file sharing, and event planning - all in one secure, private space.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/auth/sign-up">
                Create Your Space
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/auth/login">Sign in to your account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to stay connected
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for friend groups who want to organize, communicate, and share memories together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Built for your friend group
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {"Whether you're planning the next hangout, sharing photos from your last trip, or just catching up - FriendSpace makes it easy to stay connected."}
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 p-8">
                <div className="h-full rounded-xl bg-card border border-border shadow-lg flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="flex -space-x-4 justify-center mb-4">
                      {["A", "B", "C", "D"].map((letter, i) => (
                        <div
                          key={letter}
                          className="w-14 h-14 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-lg font-semibold"
                          style={{ zIndex: 4 - i }}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    <p className="font-medium text-lg">Your Friend Group</p>
                    <p className="text-sm text-muted-foreground">4 members</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to bring your friends together?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your space in seconds and start inviting your friends.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">FriendSpace</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with privacy and friendship in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
