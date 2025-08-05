'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import LoginModal from './LoginModal'
import Link from 'next/dist/client/link'

export default function MainPage() {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleViewGallery = () => {
    router.push('/myroom')
  }

  const handleLogin = () => {
    setShowLoginModal(true)
  }

  return (
    <div className="bg-[#D0D6ED]">
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
      {/* Main Section with Background Image */}
      <div className="relative min-h-screen">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/main.svg"
            alt="NearZoom Main Visual"
            className="absolute top-0 left-0 h-full w-full object-cover object-left-top"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10">
          {/* Navigation */}
          <nav className="flex items-center justify-end p-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogin}
                className="inline-flex h-[32px] items-center gap-2 rounded-md bg-gray-700 px-4 py-1.5 text-sm font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
              >
                LOGIN
              </button>
              <button
                onClick={handleViewGallery}
                className="inline-flex h-[32px] items-center gap-2 rounded-md bg-[#2D3243] px-4 py-1.5 text-sm font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-[#2D3243]/80 focus:outline-none"
              >
                MY ROOM
              </button>
              <Link
                href="/room/test"
                className="inline-flex h-[32px] items-center gap-2 rounded-md bg-[#2D3243] px-4 py-1.5 text-sm font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-[#2D3243]/80 focus:outline-none"
              >
                테스트 방 입장
              </Link>
            </div>
          </nav>
        </div>

        {/* Images positioned at bottom of main section */}
        <div className="absolute right-0 bottom-10 left-0 z-20">
          <div className="relative mx-auto h-[300px] max-w-7xl px-8">
            {/* Image 84 - 원상복구 */}
            <img
              src="/image 84.png"
              alt="Image 84"
              className="absolute top-0 left-16 h-auto w-24 rotate-12 transform drop-shadow-lg transition-transform duration-300 hover:rotate-6"
            />

            {/* Image 85 - 원상복구 */}
            <img
              src="/image 85.png"
              alt="Image 85"
              className="absolute top-8 right-20 h-auto w-28 -rotate-6 transform drop-shadow-lg transition-transform duration-300 hover:rotate-3"
            />

            {/* Image 86 - 맨 아래로 */}
            <img
              src="/image 86.png"
              alt="Image 86"
              className="absolute bottom-0 left-32 h-auto w-26 rotate-3 transform drop-shadow-lg transition-transform duration-300 hover:-rotate-6"
            />

            {/* Image 87 - 원상복구 */}
            <img
              src="/image 87.png"
              alt="Image 87"
              className="absolute top-4 left-1/2 h-auto w-22 -translate-x-1/2 rotate-[-8deg] transform drop-shadow-lg transition-transform duration-300 hover:rotate-0"
            />

            {/* Image 88 - 맨 아래로 */}
            <img
              src="/image 88.png"
              alt="Image 88"
              className="absolute right-32 bottom-0 h-auto w-24 -rotate-12 transform drop-shadow-lg transition-transform duration-300 hover:rotate-6"
            />
          </div>
        </div>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </div>

      {/* ABOUT US Section */}
      <div className="overflow-hidden bg-white px-8 pt-4 pb-8">
        <div className="relative mb-8">
          <div className="animate-scroll flex whitespace-nowrap">
            <h2
              className="mr-24 text-[175px] font-bold text-[#282828]/10"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
            <h2
              className="mr-24 text-[175px] font-bold text-[#282828]/10"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
            <h2
              className="mr-24 text-[175px] font-bold text-[#282828]/10"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
            <h2
              className="mr-24 text-[175px] font-bold text-[#282828]/10"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
            <h2
              className="mr-24 text-[175px] font-bold text-[#282828]/10"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
          </div>
        </div>
      </div>

      {/* Expanded Black Footer */}
      <footer className="bg-black py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          {/* 3-Step Process */}
          <div className="mb-16 grid gap-12 md:grid-cols-3">
            {/* Step 01 */}
            <div className="text-center">
              <div
                className="mb-4 text-4xl font-bold text-white"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                01
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">
                인생샷 업로드
              </h3>
              <p
                className="leading-relaxed text-gray-400"
                style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}
              >
                자신의 얼굴이 잘 드러난 사진 한 장을 업로드해 주세요.
              </p>
            </div>

            {/* Step 02 */}
            <div className="text-center">
              <div
                className="mb-4 text-4xl font-bold text-white"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                02
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">사진 촬영</h3>
              <p
                className="leading-relaxed text-gray-400"
                style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}
              >
                친구들과 함께 사진을 찍고, 특별한 순간을 포착해 보세요.
              </p>
            </div>

            {/* Step 03 */}
            <div className="text-center">
              <div
                className="mb-4 text-4xl font-bold text-white"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                03
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">
                편집 및 공유
              </h3>
              <p
                className="leading-relaxed text-gray-400"
                style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}
              >
                다양한 도구로 사진을 꾸미고, SNS에 공유해 보세요.
              </p>
            </div>
          </div>

          {/* Brand Info */}
          <div className="border-t border-gray-800 pt-12 text-center">
            <h3 className="mb-4 text-2xl font-bold">NearZoom</h3>
            <p className="mb-8 text-gray-400">
              따로 또 같이, 어디서든 즐기는 네컷 사진
            </p>
            <p className="text-sm text-gray-500">
              © 2024 NearZoom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
