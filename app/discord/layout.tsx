import * as React from 'react'

/**
 * Force dark mode for the entire chat experience. The marketing
 * surface still respects the user's OS preference.
 */
export default function DiscordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-ds-bg-tertiary">
      {children}
    </div>
  )
}
