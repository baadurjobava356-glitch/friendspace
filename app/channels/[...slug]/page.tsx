import { redirect } from 'next/navigation'

// Discord-style /channels/@me URLs all map to /discord for now.
export default async function ChannelsAlias({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolved = await params
  const slug = resolved.slug?.[0]
  if (slug && slug !== '@me') {
    redirect(`/discord`)
  }
  redirect('/discord')
}
