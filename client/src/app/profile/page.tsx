'use client'

import React from 'react'
import { useState } from 'react'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import MyProfile from '@/components/page/profile/MyProfile'
import { UserInfo } from '@/utils/auth'

// TODO: 실제 사용자 정보를 가져오는 훅으로 교체
const mockUserProfile: UserInfo = {
  id: '1',
  name: '김다꾸',
  email: 'user@example.com',
  profileImage: undefined,
  provider: 'kakao', // 🔥 추가
  accessToken: 'mock_access_token' // 🔥 추가
}

const ProfilePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const userProfile = mockUserProfile // TODO: useAuth() 훅으로 교체

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
          <MyProfile userId={userProfile.id} />
        </main>
      </div>
    </div>
  )
}

export default ProfilePage