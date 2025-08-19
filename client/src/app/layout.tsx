import type { Metadata } from 'next'

import './globals.css'
import AuthProvider from '@/providers/AuthProvider'

// 개발 환경에서는 폰트 로딩 건너뛰기
const isDevelopment = process.env.NODE_ENV === 'development'

// 웹폰트 import (운영 환경에서만)
let geistSans: any, geistMono: any, notoSansKR: any, jua: any, blackHanSans: any, gamjaFlower: any, gaegu: any, nanumMyeongjo: any, roboto: any

if (!isDevelopment) {
  const {
    Geist,
    Geist_Mono,
    Noto_Sans_KR,
    Jua,
    Gamja_Flower,
    Black_Han_Sans,
    Gaegu,
    Nanum_Myeongjo,
    Roboto,
  } = require('next/font/google')

  geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
  })

  geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
  })

  // 깔끔한 폰트
  notoSansKR = Noto_Sans_KR({
    variable: '--font-noto-sans-kr',
    subsets: ['latin'],
    weight: ['400', '500', '700'],
  })

  // 귀여운 폰트
  jua = Jua({
    variable: '--font-jua',
    subsets: ['latin'],
    weight: ['400'],
  })

  // 힙한 폰트
  blackHanSans = Black_Han_Sans({
    variable: '--font-black-han-sans',
    subsets: ['latin'],
    weight: ['400'],
  })

  // 손글씨 폰트
  gamjaFlower = Gamja_Flower({
    variable: '--font-gamja-flower',
    subsets: ['latin'],
    weight: ['400'],
  })

  // 삐뚤빼뚤한 폰트
  gaegu = Gaegu({
    variable: '--font-gaegu',
    subsets: ['latin'],
    weight: ['300', '400', '700'],
  })

  // 우아한 폰트
  nanumMyeongjo = Nanum_Myeongjo({
    variable: '--font-nanum-myeongjo',
    subsets: ['latin'],
    weight: ['400', '700', '800'],
  })

  // 모던 폰트
  roboto = Roboto({
    variable: '--font-roboto',
    subsets: ['latin'],
    weight: ['400', '500', '700'],
  })
} else {
  // 개발 환경에서는 빈 객체로 대체
  geistSans = geistMono = notoSansKR = jua = blackHanSans = gamjaFlower = gaegu = nanumMyeongjo = roboto = { variable: '' }
}

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
      <head>
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.1.0/kakao.min.js"
          integrity="sha384-dpu02ieKC6NUeKFoGMOKz6102CLEWi9+5RQjWSV0ikYSFFd8M3Wp2reIcquJOemx"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.Kakao) {
                Kakao.init('c089c8172def97eb00c07217cae17495');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} ${jua.variable} ${blackHanSans.variable} ${gamjaFlower.variable} ${gaegu.variable} ${nanumMyeongjo.variable} ${roboto.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
