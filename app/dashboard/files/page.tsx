import { createClient } from "@/lib/supabase/server"
import { FilesClient } from "@/components/dashboard/files/files-client"

export default async function FilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: files } = await supabase
    .from("shared_files")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")

  return (
    <FilesClient 
      currentUserId={user?.id || ""} 
      initialFiles={files || []}
      allProfiles={profiles || []}
    />
  )
}
