"use client"

import { useAuth } from "@/hooks/useAuth"
import CreativeSection from "./CreativeSection"
import AboutUsSection from "./AboutUsSection"
import Footer from "./Footer"
import LoginModal from "./LoginModal"

export default function CreativePage() {
  const {
    isLoggedIn,
    isLoginModalOpen,
    setIsLoginModalOpen,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
    isLoading,
    isCreatingRoom,
  } = useAuth()



  return (
    <div className="min-h-screen w-[90%] mx-auto">
      <CreativeSection
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onMyPage={handleMyPage}
        onAfterLoginClick={handleAfterLoginClick}
        isCreatingRoom={isCreatingRoom}
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
