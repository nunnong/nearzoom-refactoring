import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  Noto_Sans_KR,
  Jua,
  Gamja_Flower,
  Black_Han_Sans,
  Gaegu,
} from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/page/room/providers/AuthProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// 깔끔한 폰트
const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

// 귀여운 폰트
const jua = Jua({
  variable: '--font-jua',
  subsets: ['latin'],
  weight: ['400'],
})

// 힙한 폰트
const blackHanSans = Black_Han_Sans({
  variable: '--font-black-han-sans',
  subsets: ['latin'],
  weight: ['400'],
})

// 손글씨 폰트
const gamjaFlower = Gamja_Flower({
  variable: '--font-gamja-flower',
  subsets: ['latin'],
  weight: ['400'],
})

// 삐뚤빼뚤한 폰트
const gaegu = Gaegu({
  variable: '--font-gaegu',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
})

export const metadata: Metadata = {
  title: 'NearZoom',
  description: '실시간 원격 촬영 서비스',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} ${jua.variable} ${blackHanSans.variable} ${gamjaFlower.variable} ${gaegu.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
