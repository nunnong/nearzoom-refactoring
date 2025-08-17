"use client"

import { useState } from 'react'

interface AuthButtonsProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onUploadSelfie: () => void  // UPLOAD SELFIE 핸들러 추가
  onAccount: () => void       // ACCOUNT 핸들러 추가
  user?: {
    name?: string
    email?: string
    profileImage?: string
  } | null
}

export default function AuthButtons({ 
  isLoggedIn, 
  onLogin, 
  onLogout, 
  onMyPage, 
  onMyFeed, 
  onUploadSelfie,  // UPLOAD SELFIE 핸들러
  onAccount,       // ACCOUNT 핸들러
  user 
}: AuthButtonsProps) {
  console.log('IsLogin - isLoggedIn:', isLoggedIn)
  console.log('IsLogin - user:', user)
  console.log('IsLogin - user.profileImage:', user?.profileImage)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  return (
    <div className="flex items-center gap-3">
      {isLoggedIn ? (
        <> 
          {/* User Profile Icon */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || 'Profile'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 프로필 이미지 로드 실패 시 fallback으로 전환
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            ) : null}
            {/* Fallback: 프로필 이미지가 없을 때 이니셜 표시 */}
            <div 
              className={`w-full h-full flex items-center justify-center ${
                user?.profileImage ? 'hidden' : 'flex'
              }`}
            >
              <span className="text-white text-sm font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 
                 user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          </div>

          {/* Hamburger Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Dropdown Menu - 단순화된 구조 */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  {/* UPLOAD SELFIE */}
                  <button
                    onClick={() => {
                      onUploadSelfie()
                      setIsMenuOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 text-gray-800 border-b border-gray-100"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">UPLOAD SELFIE</p>
                      <p className="text-xs text-gray-500">AI 프로필 이미지 생성</p>
                    </div>
                  </button>
                  
                  {/* ACCOUNT */}
                  <button
                    onClick={() => {
                      onAccount()
                      setIsMenuOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 border-b border-gray-100"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <p className="font-medium">ACCOUNT</p>
                      <p className="text-xs text-gray-500">프로필 설정 및 관리</p>
                    </div>
                  </button>
                  
                  {/* LOGOUT - 빨간색 */}
                  <button
                    onClick={() => {
                      onLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                  >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <div>
                      <p className="font-medium">LOGOUT</p>
                      <p className="text-xs text-red-500">현재 기기에서 로그아웃</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* LOGIN Button */}
          <button
            onClick={onLogin}
            className="inline-flex h-[50px] items-center gap-2 rounded-lg bg-gray-700 px-8 py-3 text-lg font-bold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            LOGIN
          </button>
        </>
      )}
    </div>
  )
}
