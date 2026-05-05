import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Friendspace — Your place to talk',
  description: 'A Discord-style chat platform for your friends. Servers, channels, voice, video, DMs, real-time messaging, reactions, replies, pins, and more.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark min-h-screen bg-ds-bg-tertiary" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `}</Script>
      </head>
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
