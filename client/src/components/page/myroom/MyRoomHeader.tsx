'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

// 햄버거 메뉴 컴포넌트
function HamburgerMenu({
  isOpen,
  onToggle,
  onUploadSelfie,
  onAccount,
  onLogout,
}: {
  isOpen: boolean
  onToggle: () => void
  onUploadSelfie: () => void
  onAccount: () => void
  onLogout: () => void
}) {
  return (
    <div className="relative">
      {/* 햄버거 버튼 */}
      <button
        onClick={onToggle}
        className="flex flex-col justify-center items-center w-8 h-8 space-y-1"
      >
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50">
          <button
            onClick={onUploadSelfie}
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 transition-colors jaso-sans-font"
          >
            UPLOAD SELFIE
          </button>
          <button
            onClick={onAccount}
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 transition-colors jaso-sans-font"
          >
            ACCOUNT
          </button>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 transition-colors jaso-sans-font"
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  )
}

// 메인 헤더 컴포넌트
export default function MyRoomHeader({
  user,
  onUploadSelfie,
  onAccount,
  onLogout,
}: {
  user?: { name?: string; email?: string; profileImage?: string } | null
  onUploadSelfie?: () => void
  onAccount?: () => void
  onLogout?: () => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogoClick = () => {
    router.push('/')
  }

  const handleFeedClick = () => {
    router.push('/feed')
  }

  const handleExploreClick = () => {
    router.push('/explore')
  }

  const handleUploadSelfie = () => {
    setIsMenuOpen(false)
    onUploadSelfie?.()
    console.log('Upload selfie clicked')
  }

  const handleAccount = () => {
    setIsMenuOpen(false)
    onAccount?.()
    console.log('Account clicked')
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    onLogout?.()
    console.log('Logout clicked')
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* 좌측 로고 */}
          <div className="flex items-center">
            <button 
              onClick={handleLogoClick}
              className="relative w-32 h-8 md:w-40 md:h-10 cursor-pointer"
            >
              <Image
                src="/NZ.png"
                alt="NEARZOOM"
                fill
                className="object-contain"
                priority
              />
            </button>
          </div>

          {/* 중앙 네비게이션 */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={handleFeedClick}
              className=" text-lg font-medium text-black transition-colors hover:text-gray-600"
            >
              FEED
            </button>
            <button
              onClick={handleExploreClick}
              className=" text-lg font-medium text-black transition-colors hover:text-gray-600"
            >
              EXPLORE
            </button>
          </div>

          {/* 우측 프로필과 햄버거 메뉴 */}
          <div className="flex items-center gap-4">
            {/* 프로필 원형 아바타 */}
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            
            {/* 햄버거 메뉴 */}
            <HamburgerMenu
              isOpen={isMenuOpen}
              onToggle={() => setIsMenuOpen(!isMenuOpen)}
              onUploadSelfie={handleUploadSelfie}
              onAccount={handleAccount}
              onLogout={handleLogout}
            />
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        <div className="md:hidden mt-4 flex items-center justify-center gap-6">
          <button
            onClick={handleFeedClick}
            className=" text-base font-medium text-black transition-colors hover:text-gray-600"
          >
            FEED
          </button>
          <button
            onClick={handleExploreClick}
            className=" text-base font-medium text-black transition-colors hover:text-gray-600"
          >
            EXPLORE
          </button>
        </div>
      </div>
    </header>
  )
}