import { createClient } from "@/lib/supabase/server"
import { CalendarClient } from "@/components/dashboard/calendar/calendar-client"

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      event_participants (
        user_id,
        status
      )
    `)
    .order("start_time", { ascending: true })

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")

  return (
    <CalendarClient 
      currentUserId={user?.id || ""} 
      initialEvents={events || []}
      allProfiles={profiles || []}
    />
  )
}
