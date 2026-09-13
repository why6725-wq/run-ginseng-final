import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '나는 어떤 사람일까 · 사주 풀이',
  description: '생년월일만 넣으면 사주를 계산하고 AI가 풀어드립니다. 오늘의 운세와 궁합까지.',
}

export const viewport = {
  themeColor: '#0b0a18',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
