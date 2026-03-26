import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Review Ops',
  description: '검수 작업 관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" style={{ colorScheme: 'light' }}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
