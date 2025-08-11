"use client"

import { useAuth } from "@/hooks/auth"
import CreativeSection from "./CreativeSection"
import AboutUsSection from "./AboutUsSection"
import Footer from "./Footer"
import { useEffect } from "react"

export default function CreativePage() {
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



  return (
    <div className="min-h-screen w-full mx-auto transform origin-top" style={{transform: 'scaleX(0.9)'}}>
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
