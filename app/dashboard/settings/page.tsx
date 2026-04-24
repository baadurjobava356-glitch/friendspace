import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "@/components/dashboard/settings/settings-client"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <SettingsClient 
      user={user}
      initialProfile={profile}
    />
  )
}
