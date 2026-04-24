"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface EventParticipant {
  user_id: string
  status: string
}

interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string | null
  is_all_day: boolean
  color: string
  created_by: string
  event_participants: EventParticipant[]
}

interface CalendarClientProps {
  currentUserId: string
  initialEvents: Event[]
  allProfiles: Profile[]
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", 
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"
]

export function CalendarClient({ 
  currentUserId, 
  initialEvents,
  allProfiles 
}: CalendarClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    color: COLORS[0],
  })
  const supabase = createClient()

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const startTime = new Date(`${newEvent.date}T${newEvent.startTime || "00:00"}`)
    const endTime = newEvent.endTime 
      ? new Date(`${newEvent.date}T${newEvent.endTime}`)
      : null

    const { data, error } = await supabase
      .from("events")
      .insert({
        title: newEvent.title,
        description: newEvent.description || null,
        location: newEvent.location || null,
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() || null,
        color: newEvent.color,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (!error && data) {
      await supabase.from("event_participants").insert({
        event_id: data.id,
        user_id: currentUserId,
        status: "going",
      })

      setEvents((prev) => [...prev, { ...data, event_participants: [{ user_id: currentUserId, status: "going" }] }])
      setIsCreating(false)
      setNewEvent({
        title: "",
        description: "",
        location: "",
        date: "",
        startTime: "",
        endTime: "",
        color: COLORS[0],
      })
    }

    setIsLoading(false)
  }

  async function updateRSVP(eventId: string, status: string) {
    const existingParticipant = events
      .find((e) => e.id === eventId)
      ?.event_participants.find((p) => p.user_id === currentUserId)

    if (existingParticipant) {
      await supabase
        .from("event_participants")
        .update({ status })
        .eq("event_id", eventId)
        .eq("user_id", currentUserId)
    } else {
      await supabase.from("event_participants").insert({
        event_id: eventId,
        user_id: currentUserId,
        status,
      })
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              event_participants: [
                ...event.event_participants.filter((p) => p.user_id !== currentUserId),
                { user_id: currentUserId, status },
              ],
            }
          : event
      )
    )
  }

  function getEventsForDate(date: Date) {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  function getProfileById(id: string) {
    return allProfiles.find((p) => p.id === id)
  }

  const selectedDateEvents = getEventsForDate(selectedDate)
  const upcomingEvents = events
    .filter((e) => new Date(e.start_time) >= new Date())
    .slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Plan events with your friends</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>
                Plan a new event for your group
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createEvent} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    placeholder="Event title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Start Time</FieldLabel>
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>End Time</FieldLabel>
                    <Input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Location</FieldLabel>
                  <Input
                    placeholder="Where is it?"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    placeholder="What's the event about?"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                  />
                </Field>
                <Field>
                  <FieldLabel>Color</FieldLabel>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform",
                          newEvent.color === color && "scale-110 ring-2 ring-offset-2 ring-foreground"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4" /> : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                const dayEvents = getEventsForDate(date)
                const isSelected = 
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === currentMonth.getMonth() &&
                  selectedDate.getFullYear() === currentMonth.getFullYear()
                const isToday = 
                  new Date().getDate() === day &&
                  new Date().getMonth() === currentMonth.getMonth() &&
                  new Date().getFullYear() === currentMonth.getFullYear()

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-colors",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected && isToday && "bg-accent/20",
                      !isSelected && !isToday && "hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isToday && !isSelected && "text-primary"
                    )}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? "currentColor" : event.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length === 0
                  ? "No events scheduled"
                  : `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No events for this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const myStatus = event.event_participants.find(
                        (p) => p.user_id === currentUserId
                      )?.status

                      return (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-muted/50 border-l-4"
                          style={{ borderLeftColor: event.color }}
                        >
                          <p className="font-medium text-sm">{event.title}</p>
                          {event.start_time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(event.start_time).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                          <div className="flex gap-1 mt-2">
                            <Button
                              size="sm"
                              variant={myStatus === "going" ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => updateRSVP(event.id, "going")}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Going
                            </Button>
                            <Button
                              size="sm"
                              variant={myStatus === "not_going" ? "destructive" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => updateRSVP(event.id, "not_going")}
                            >
                              <X className="w-3 h-3 mr-1" />
                              {"Can't go"}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedDate(new Date(event.start_time))}
                      >
                        <div
                          className="w-2 h-full min-h-10 rounded-full mt-1"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.start_time).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {event.event_participants.filter((p) => p.status === "going").length} going
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
