'use client'

import { useAuth } from '@/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation' // 🔥 추가: useSearchParams import
import CreativeSection from './CreativeSection'
import AboutUsSection from './AboutUsSection'
import Footer from './Footer'
import { useEffect } from 'react'

export default function CreativePage() {
  const router = useRouter() // 🔥 추가
  const searchParams = useSearchParams() // 🔥 추가

  const {
    isLoggedIn,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleMyFeed,
    handleAfterLoginClick,
    initializeAuth,
    user,
    isCreatingRoom,
  } = useAuth()

  useEffect(() => {
    initializeAuth()
  }, [])

  useEffect(() => {
    console.log('MainPage - isLoggedIn:', isLoggedIn)
  }, [isLoggedIn])

  // 🔥 추가: URL 파라미터 처리 (로그인 후 방 생성)
  useEffect(() => {
    if (isLoggedIn) {
      const action = searchParams.get('action')
      if (action === 'createRoom') {
        console.log('✅ 로그인 완료 - URL 파라미터로 방 생성 실행')
        // URL 파라미터 제거
        router.replace('/', { scroll: false })
        // 방 생성 실행
        handleAfterLoginClick()
      }
    }
  }, [isLoggedIn, searchParams, router, handleAfterLoginClick])

  return (
    <div
      className="mx-auto min-h-screen w-full origin-top transform"
      style={{ transform: 'scaleX(0.9)' }}
    >
      <CreativeSection
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onMyPage={handleMyPage}
        onMyFeed={handleMyFeed}
        onAfterLoginClick={handleAfterLoginClick}
        user={user}
        isCreatingRoom={isCreatingRoom}
      />

      <AboutUsSection />

      <Footer />
    </div>
  )
}
