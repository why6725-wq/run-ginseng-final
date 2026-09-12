import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '사주 풀이',
  description: '생년월일로 사주팔자를 계산하고 AI가 풀어서 설명해 드립니다.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
