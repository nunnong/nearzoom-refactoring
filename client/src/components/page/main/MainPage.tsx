"use client"

import { useAuth } from "@/hooks/useAuth"
import CreativeSection from "./CreativeSection"
import AboutUsSection from "./AboutUsSection"
import Footer from "./Footer"
import LoginModal from "./LoginModal"
import { useEffect } from "react"

export default function CreativePage() {
  const {
    isLoggedIn,
    isLoginModalOpen,
    setIsLoginModalOpen,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleMyFeed,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
    isLoading,
    initializeAuth,
    user
  } = useAuth()

  useEffect(() => {
    initializeAuth()
  }, [])

  useEffect(() => {
    console.log('MainPage - isLoggedIn:', isLoggedIn)
  }, [isLoggedIn])

  return (
    <div className="min-h-screen w-full mx-auto transform scale-[0.8] origin-top">
      <CreativeSection
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onMyPage={handleMyPage}
        onMyFeed={handleMyFeed}
        onAfterLoginClick={handleAfterLoginClick}
        user={user}
      />

      <AboutUsSection />

      <Footer />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onKakaoLogin={handleKakaoLoginClick}
        onGoogleLogin={handleGoogleLoginClick}
        isLoading={isLoading}
      />
    </div>
  )
}
