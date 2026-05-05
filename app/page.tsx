import { DiscordApp } from '@/components/discord/discord-app'
import { loadDiscordHomeInitialProps } from '@/lib/discord/discord-home-loader'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const props = await loadDiscordHomeInitialProps()
  return <DiscordApp {...props} />
}
