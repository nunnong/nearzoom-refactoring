'use client'

import React from 'react'
import { useState } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import MyProfile from '@/components/page/profile/MyProfile'
import { User } from '@/types/auth'

const ProfilePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const { user: currentUser, isAuthenticated } = useAuth()

  // 🔥 올바른 User 타입 사용
  const mockUserProfile: User = {
    id: 1, // number 타입
    name: '김다꾸',
    email: 'user@example.com',
    profileImage: undefined,
    socialType: 'KAKAO', // SocialType 사용
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-08-10T00:00:00Z'
  }

  // 🔥 실제 사용자 또는 Mock 사용자 사용
  const userProfile = isAuthenticated && currentUser ? currentUser : mockUserProfile

  const handleUploadSelfie = (): void => {
    const currentPath = window.location.pathname
    const returnUrl = encodeURIComponent(currentPath)
    window.location.href = `/upload-selfie?returnUrl=${returnUrl}`
  }

  const handleAccount = (): void => {
    console.log('Account settings')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideList
        isOpen={isSidebarOpen}
        userProfile={userProfile}
        onUploadSelfie={handleUploadSelfie}
        onAccount={handleAccount}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        <EnhancedHeader
          title="My Profile"
          userProfile={userProfile}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        />

        <main className="p-4 lg:p-8">
          {/* 🔥 userId를 string으로 변환해서 전달 */}
          <MyProfile userId={userProfile.id.toString()} />
        </main>
      </div>
    </div>
  )
}

export default ProfilePage