import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rent-to-Own Marketplace | Drive Your Future',
  description: 'Flexible rent-to-own vehicle marketplace with intelligent credit scoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

