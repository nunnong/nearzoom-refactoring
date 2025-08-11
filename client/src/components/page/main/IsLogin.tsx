"use client"

import { useState } from 'react'

interface AuthButtonsProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  user?: {
    name?: string
    email?: string
    profileImage?: string
  } | null
}

export default function AuthButtons({ isLoggedIn, onLogin, onLogout, onMyPage, onMyFeed, user }: AuthButtonsProps) {
  console.log('IsLogin - isLoggedIn:', isLoggedIn)
  console.log('IsLogin - user:', user)
  console.log('IsLogin - user.profileImage:', user?.profileImage)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMyFeedOpen, setIsMyFeedOpen] = useState(false)
  
  return (
    <div className="flex items-center gap-3">
      {isLoggedIn ? (
        <> 
          {/* User Profile Icon */}
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
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
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  <button
                    onClick={() => {
                      onMyPage()
                      setIsMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                    </svg>
                    MY ROOM
                  </button>
                  
                  {/* MY FEED with nested dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMyFeedOpen(!isMyFeedOpen)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center justify-between gap-2 text-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        </svg>
                        MY FEED
                      </div>
                      <svg className={`w-4 h-4 transition-transform ${isMyFeedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* MY FEED Icons Submenu */}
                    {isMyFeedOpen && (
                      <div className="ml-4 border-l-2 border-gray-100">
                        <button
                          onClick={() => {
                            setIsMyFeedOpen(false)
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                        >
                          <img src="/Home.png" alt="Home feeds"className="w-5 h-5 object-contain" />
                          Home
                        </button>
                        <button
                          onClick={() => {
                            /* Search.png 관련 새로운 기능 */
                            setIsMyFeedOpen(false)
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                        >
                          <img src="/Search.png" alt="All feeds" className="w-5 h-5 object-contain" />
                          Search
                        </button>
                        <button
                          onClick={() => {
                            /* User.png 관련 새로운 기능 */
                            setIsMyFeedOpen(false)
                            setIsMenuOpen(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                        >
                          <img src="/User.png" alt="My feed" className="w-5 h-5 object-contain" />
                          Profile
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <hr className="my-2 border-gray-200" />
                  
                  <button
                    onClick={() => {
                      onLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    LOGOUT
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
