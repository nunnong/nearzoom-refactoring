import type { Metadata } from "next";
// import { Geist, Geist_Mono, Noto_Sans_KR, Jua, Gamja_Flower, Black_Han_Sans, Gaegu } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// const notoSansKR = Noto_Sans_KR({
//   variable: "--font-noto-sans-kr",
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
// });

// const jua = Jua({
//   variable: "--font-jua",
//   subsets: ["latin"],
//   weight: ["400"],
// });

// const blackHanSans = Black_Han_Sans({
//   variable: "--font-black-han-sans",
//   subsets: ["latin"],
//   weight: ["400"],
// });

// const gamjaFlower = Gamja_Flower({
//   variable: "--font-gamja-flower",
//   subsets: ["latin"],
//   weight: ["400"],
// });

// const gaegu = Gaegu({
//   variable: "--font-gaegu",
//   subsets: ["latin"],
//   weight: ["300", "400", "700"],
// });

export const metadata: Metadata = {
  title: "NearZoom",
  description: "실시간 원격 촬영 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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
            `
          }}
        />
      </head>
      <body
        // className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} ${jua.variable} ${blackHanSans.variable} ${gamjaFlower.variable} ${gaegu.variable} antialiased`}
        className={`antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}