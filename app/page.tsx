import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Hash,
  Volume2,
  Mic,
  Headphones,
  Users,
  Sparkles,
  Shield,
  Plus,
  ArrowRight,
  CheckCircle2,
  Send,
} from 'lucide-react'

const features = [
  {
    icon: Hash,
    title: 'Text Channels',
    description: 'Organize conversations into channels and categories. Replies, mentions, reactions, pins, and threads — exactly what you expect.',
  },
  {
    icon: Volume2,
    title: 'Voice & Video',
    description: 'Hop into voice channels with one click. Mute, deafen, screen-share, and see who is in voice with you in real time.',
  },
  {
    icon: Users,
    title: 'Servers & Roles',
    description: 'Create servers for your friend groups, study clubs, or projects. Owners and admins can manage members, invites, and channels.',
  },
  {
    icon: Sparkles,
    title: 'Rich Messages',
    description: 'Send markdown, code blocks, mentions, custom emoji, files, images, and videos. Edit and delete with one keystroke.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Row-level security on every table. Your servers are gated to members only — no exceptions, ever.',
  },
  {
    icon: Send,
    title: 'Direct Messages',
    description: 'Slide into your friends\' DMs without leaving the app. Real-time messaging with read receipts and presence.',
  },
]

const benefits = [
  'Unlimited servers and channels',
  'Voice channels with mute & deafen',
  'Real-time messages, reactions & typing',
  'Markdown, mentions, replies, pins, files',
  'Server invites with expiry & revocation',
  'Roles, kicks, ownership transfers',
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--ds-blurple)' }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Friendspace</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild className="text-white" style={{ background: 'var(--ds-blurple)' }}>
              <Link href="/auth/sign-up">Open Friendspace</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(70% 60% at 50% 0%, rgba(88,101,242,0.18), transparent 70%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6"
            style={{ background: 'rgba(88,101,242,0.12)', color: 'var(--ds-blurple)' }}
          >
            <Sparkles className="w-4 h-4" />
            The all-new chat app for your friend group
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 text-balance">
            Your place to talk
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            Whether you&apos;re part of a school club, a study group, a worldwide art community, or just a handful of
            friends that want to spend time together — Friendspace makes it easy to talk every day and hang out more
            often.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto text-white"
              style={{ background: 'var(--ds-blurple)' }}
            >
              <Link href="/auth/sign-up">
                Open Friendspace in your browser
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/auth/login">Sign in to your account</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Already a member? Jump straight to the <Link href="/discord" className="underline">app</Link>.
          </p>
        </div>

        {/* App preview */}
        <div className="max-w-5xl mx-auto px-4 mt-16">
          <div
            className="rounded-2xl shadow-2xl border border-border overflow-hidden"
            style={{ background: 'var(--ds-bg-tertiary)' }}
          >
            <FakeAppPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything Discord has — and more.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Friendspace gives you all the chat features you love, with a Supabase-powered backend you can self-host.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl p-6 bg-card border border-border">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(88,101,242,0.10)' }}
                >
                  <f.icon className="w-6 h-6" style={{ color: 'var(--ds-blurple)' }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for the way you talk</h2>
            <p className="text-lg text-muted-foreground mb-8">
              From quick check-ins to all-night gaming sessions, Friendspace gives you the tools to stay connected
              with the people who matter.
            </p>
            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ds-online)' }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-3">
              <Button asChild className="text-white" style={{ background: 'var(--ds-blurple)' }}>
                <Link href="/auth/sign-up">
                  <Plus className="w-4 h-4 mr-2" /> Create a server
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/discord">Open the app</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl p-8" style={{ background: 'var(--ds-bg-secondary)' }}>
            <div className="flex items-center gap-3 mb-4 text-white">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                style={{ background: 'var(--ds-blurple)' }}
              >
                FS
              </div>
              <div>
                <p className="font-bold">Friendspace HQ</p>
                <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>
                  4 channels · 12 online
                </p>
              </div>
            </div>
            <ChannelRowDemo icon={Hash} label="general" active />
            <ChannelRowDemo icon={Hash} label="random" />
            <ChannelRowDemo icon={Volume2} label="Lounge" />
            <ChannelRowDemo icon={Volume2} label="Movie Night" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: 'rgba(88,101,242,0.05)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to bring everyone together?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your space in seconds and invite your friends.
          </p>
          <Button size="lg" asChild className="text-white" style={{ background: 'var(--ds-blurple)' }}>
            <Link href="/auth/sign-up">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--ds-blurple)' }}
            >
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Friendspace</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Discord-style chat, fully open and yours. Built with Next.js + Supabase.
          </p>
        </div>
      </footer>
    </div>
  )
}

function ChannelRowDemo({
  icon: Icon, label, active,
}: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean }) {
  return (
    <div
      className="px-2 h-8 rounded flex items-center gap-2 mb-1"
      style={{
        color: active ? '#fff' : 'var(--ds-channel-default)',
        background: active ? 'rgba(78,80,88,.32)' : 'transparent',
      }}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

function FakeAppPreview() {
  return (
    <div className="grid grid-cols-[72px_240px_1fr] h-[420px]">
      <div className="bg-[#1E1F22] flex flex-col items-center py-3 gap-2">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{ background: 'var(--ds-blurple)' }}>FS</div>
        <div className="w-8 h-px bg-[#3F4147]" />
        <div className="w-12 h-12 rounded-3xl bg-[#5865F2] text-white flex items-center justify-center font-bold">A</div>
        <div className="w-12 h-12 rounded-3xl bg-[#3BA55D] text-white flex items-center justify-center font-bold">B</div>
        <div className="w-12 h-12 rounded-3xl bg-[#F0B232] text-white flex items-center justify-center font-bold">C</div>
        <div className="w-12 h-12 rounded-3xl border-2 border-dashed border-[#3F4147] text-[#3BA55D] flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
      </div>
      <div className="bg-[#2B2D31] flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/40 text-white font-bold">Friendspace HQ</div>
        <div className="flex-1 px-2 py-3">
          <p className="text-[11px] uppercase tracking-wide text-[#80848E] font-bold mb-1 px-2">Text Channels</p>
          <ChannelRowDemo icon={Hash} label="general" active />
          <ChannelRowDemo icon={Hash} label="random" />
          <ChannelRowDemo icon={Hash} label="memes" />
          <p className="text-[11px] uppercase tracking-wide text-[#80848E] font-bold mb-1 mt-3 px-2">Voice Channels</p>
          <ChannelRowDemo icon={Volume2} label="Lounge" />
          <ChannelRowDemo icon={Volume2} label="Movie Night" />
        </div>
        <div className="h-13 px-2 py-2 bg-[#232428] flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center text-xs font-bold">YO</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">You</p>
            <p className="text-[11px] text-[#80848E] truncate">Online</p>
          </div>
          <Mic className="w-4 h-4 text-[#80848E]" />
          <Headphones className="w-4 h-4 text-[#80848E]" />
        </div>
      </div>
      <div className="bg-[#313338] flex flex-col">
        <div className="h-12 px-4 flex items-center text-white border-b border-black/40">
          <Hash className="w-5 h-5 mr-2 text-[#80848E]" />
          <span className="font-bold">general</span>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <FakeMsg name="Maya" color="#EB459E" content="Game night Saturday at 8?" />
          <FakeMsg name="Leo" color="#5865F2" content="I'm in! ✨ Sending the calendar invite now." />
          <FakeMsg name="Riley" color="#3BA55D" content="**Yesss** — bringing snacks 🎉" />
        </div>
        <div className="px-4 pb-4">
          <div className="bg-[#383A40] rounded-md h-11 flex items-center px-3 text-[#80848E]">Message #general</div>
        </div>
      </div>
    </div>
  )
}

function FakeMsg({ name, color, content }: { name: string; color: string; content: string }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
        style={{ background: color }}
      >
        {name[0]}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-semibold">{name}</span>
          <span className="text-[11px] text-[#80848E]">Today at 7:42 PM</span>
        </div>
        <p className="text-[#DBDEE1]">{content}</p>
      </div>
    </div>
  )
}
