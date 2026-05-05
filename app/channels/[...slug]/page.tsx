import { redirect } from 'next/navigation'

// Discord-style /channels/@me URLs map to the root app.
export default async function ChannelsAlias({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolved = await params
  const slug = resolved.slug?.[0]
  if (slug && slug !== '@me') {
    redirect('/')
  }
  redirect('/')
}
