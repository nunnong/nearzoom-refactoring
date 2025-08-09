"use client"

import { useState } from 'react'

interface AuthButtonsProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
}

export default function AuthButtons({ isLoggedIn, onLogin, onLogout, onMyPage, onMyFeed }: AuthButtonsProps) {
  console.log('IsLogin - isLoggedIn:', isLoggedIn)
  const [isMyFeedHovered, setIsMyFeedHovered] = useState(false)
  
  return (
    <div className="flex items-center gap-3">
      {isLoggedIn ? (
        <>
          {/* LOGOUT Button */}
          <button
            onClick={onLogout}
            className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            LOGOUT
          </button>

          {/* MY ROOM Button */}
          <button
            onClick={onMyPage}
            className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            MY ROOM
          </button>

          {/* MY FEED Button with click toggle */}
          <div className="relative">
            <button
              onClick={() => setIsMyFeedHovered(!isMyFeedHovered)}
              className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
            >
              MY FEED
            </button>
            
            {/* Toggle Menu */}
            {isMyFeedHovered && (
              <div className="absolute left-full top-0 ml-2 w-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="flex flex-col p-2 space-y-2">
                  <button
                    onClick={() => {
                      /* Home.png 관련 새로운 기능 */
                      setIsMyFeedHovered(false) // 클릭 후 토글 닫기
                    }}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Feature 1"
                  >
                    <img src="/Home.png" alt="Feature 1" className="w-6 h-6 object-contain" />
                  </button>
                  <button
                    onClick={() => {
                      /* Search.png 관련 새로운 기능 */
                      setIsMyFeedHovered(false) // 클릭 후 토글 닫기
                    }}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Feature 2"
                  >
                    <img src="/Search.png" alt="Feature 2" className="w-6 h-6 object-contain" />
                  </button>
                  <button
                    onClick={() => {
                      /* User.png 관련 새로운 기능 */
                      setIsMyFeedHovered(false) // 클릭 후 토글 닫기
                    }}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Feature 3"
                  >
                    <img src="/User.png" alt="Feature 3" className="w-6 h-6 object-contain" />
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
