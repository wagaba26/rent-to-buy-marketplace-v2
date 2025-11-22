import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ui'

export const metadata: Metadata = {
  title: 'AutoLadder | Your Journey to Vehicle Ownership',
  description: 'AutoLadder makes vehicle ownership accessible through flexible rent-to-own plans. No credit history? No problem.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

