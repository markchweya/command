import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Command',
  description: 'Connect ChatGPT to your local development workspace.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
