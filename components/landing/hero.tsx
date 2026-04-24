"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Play, Users, Mic, Monitor } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-6 border-accent/50 bg-accent/10 text-accent">
            <span className="mr-2">New</span>
            WebRTC-Powered Voice Rooms
            <ArrowRight className="ml-2 h-3 w-3" />
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Real-time voice for your{" "}
            <span className="text-accent">web forum</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl">
            Transform your community with crystal-clear voice calling and seamless screen sharing. 
            Support up to 10 participants with enterprise-grade security.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <span className="mt-4 text-3xl font-bold">10</span>
            <span className="text-sm text-muted-foreground">Participants per room</span>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Mic className="h-6 w-6 text-accent" />
            </div>
            <span className="mt-4 text-3xl font-bold">48kHz</span>
            <span className="text-sm text-muted-foreground">Crystal-clear audio</span>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Monitor className="h-6 w-6 text-accent" />
            </div>
            <span className="mt-4 text-3xl font-bold">4K</span>
            <span className="text-sm text-muted-foreground">Screen sharing quality</span>
          </div>
        </div>

        {/* Mock UI Preview */}
        <div className="mt-20 rounded-2xl border border-border bg-card/30 p-4 backdrop-blur-sm lg:p-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <VoiceRoomPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

function VoiceRoomPreview() {
  const participants = [
    { name: "Sarah Chen", speaking: true, muted: false },
    { name: "Mike Johnson", speaking: false, muted: false },
    { name: "Emily Davis", speaking: false, muted: true },
    { name: "Alex Rivera", speaking: false, muted: false },
    { name: "Jordan Lee", speaking: false, muted: false },
  ]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm font-medium">General Discussion</span>
          <span className="text-xs text-muted-foreground">5 participants</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">00:15:32</span>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
        {participants.map((participant, index) => (
          <div
            key={index}
            className={`relative flex flex-col items-center rounded-xl border p-4 transition-all ${
              participant.speaking
                ? "border-accent bg-accent/10"
                : "border-border bg-secondary/30"
            }`}
          >
            <div className={`relative h-14 w-14 rounded-full bg-muted ${
              participant.speaking ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
            }`}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-lg font-semibold">
                {participant.name.split(" ").map(n => n[0]).join("")}
              </div>
              {participant.muted && (
                <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive">
                  <svg className="h-3 w-3 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </div>
              )}
            </div>
            <span className="mt-3 text-xs font-medium truncate max-w-full">{participant.name}</span>
            {participant.speaking && (
              <div className="mt-1 flex items-center gap-0.5">
                <div className="h-2 w-0.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                <div className="h-3 w-0.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-0.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
                <div className="h-4 w-0.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: "450ms" }} />
                <div className="h-2 w-0.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: "600ms" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 border-t border-border bg-secondary/50 px-4 py-4">
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-card transition-colors hover:bg-muted">
          <Mic className="h-5 w-5" />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-card transition-colors hover:bg-muted">
          <Monitor className="h-5 w-5" />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-opacity hover:opacity-90">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
