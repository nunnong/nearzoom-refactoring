'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import LoginModal from './LoginModal'

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
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/main.svg"
            alt="NearZoom Main Visual"
            className="absolute top-0 left-0 w-full h-full object-cover object-left-top"
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
            </div>
          </nav>
        </div>

        {/* Images positioned at bottom of main section */}
        <div className="absolute bottom-10 left-0 right-0 z-20">
          <div className="relative max-w-7xl mx-auto h-[300px] px-8">
            {/* Image 84 - 원상복구 */}
            <img
              src="/image 84.png"
              alt="Image 84"
              className="absolute top-0 left-16 w-24 h-auto transform rotate-12 hover:rotate-6 transition-transform duration-300 drop-shadow-lg"
            />
            
            {/* Image 85 - 원상복구 */}
            <img
              src="/image 85.png"
              alt="Image 85"
              className="absolute top-8 right-20 w-28 h-auto transform -rotate-6 hover:rotate-3 transition-transform duration-300 drop-shadow-lg"
            />
            
            {/* Image 86 - 맨 아래로 */}
            <img
              src="/image 86.png"
              alt="Image 86"
              className="absolute bottom-0 left-32 w-26 h-auto transform rotate-3 hover:-rotate-6 transition-transform duration-300 drop-shadow-lg"
            />
            
            {/* Image 87 - 원상복구 */}
            <img
              src="/image 87.png"
              alt="Image 87"
              className="absolute top-4 left-1/2 transform -translate-x-1/2 w-22 h-auto rotate-[-8deg] hover:rotate-0 transition-transform duration-300 drop-shadow-lg"
            />
            
            {/* Image 88 - 맨 아래로 */}
            <img
              src="/image 88.png"
              alt="Image 88"
              className="absolute bottom-0 right-32 w-24 h-auto transform -rotate-12 hover:rotate-6 transition-transform duration-300 drop-shadow-lg"
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
      <div className="bg-white pt-4 pb-8 px-8 overflow-hidden">
        <div className="relative mb-8">
          <div className="flex whitespace-nowrap animate-scroll">
            <h2 className="text-[175px] font-bold text-[#282828]/10 mr-24" style={{ fontFamily: 'Playfair Display, serif' }}>
              ABOUT US
            </h2>
            <h2 className="text-[175px] font-bold text-[#282828]/10 mr-24" style={{ fontFamily: 'Playfair Display, serif' }}>
              ABOUT US
            </h2>
            <h2 className="text-[175px] font-bold text-[#282828]/10 mr-24" style={{ fontFamily: 'Playfair Display, serif' }}>
              ABOUT US
            </h2>
            <h2 className="text-[175px] font-bold text-[#282828]/10 mr-24" style={{ fontFamily: 'Playfair Display, serif' }}>
              ABOUT US
            </h2>
            <h2 className="text-[175px] font-bold text-[#282828]/10 mr-24" style={{ fontFamily: 'Playfair Display, serif' }}>
              ABOUT US
            </h2>
          </div>
        </div>
      </div>

      {/* Expanded Black Footer */}
      <footer className="bg-black text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          {/* 3-Step Process */}
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {/* Step 01 */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>01</div>
              <h3 className="text-xl font-bold mb-4 text-white">인생샷 업로드</h3>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}>
                자신의 얼굴이 잘 드러난 사진 한 장을 업로드해 주세요.
              </p>
            </div>

            {/* Step 02 */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>02</div>
              <h3 className="text-xl font-bold mb-4 text-white">사진 촬영</h3>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}>
                친구들과 함께 사진을 찍고, 특별한 순간을 포착해 보세요.
              </p>
            </div>

            {/* Step 03 */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>03</div>
              <h3 className="text-xl font-bold mb-4 text-white">편집 및 공유</h3>
              <p className="text-gray-400 leading-relaxed" style={{ fontFamily: 'NanumBarunGothic, sans-serif' }}>
                다양한 도구로 사진을 꾸미고, SNS에 공유해 보세요.
              </p>
            </div>
          </div>

          {/* Brand Info */}
          <div className="text-center border-t border-gray-800 pt-12">
            <h3 className="text-2xl font-bold mb-4">NearZoom</h3>
            <p className="text-gray-400 mb-8">
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