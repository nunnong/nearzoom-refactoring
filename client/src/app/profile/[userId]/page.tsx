'use client'

import React from 'react'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import UserProfile from '@/components/page/profile/UserProfile'
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

const UserProfilePage: React.FC = () => {
  const params = useParams()
  const userId = params.userId as string
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const currentUser = mockUserProfile
  
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
        userProfile={currentUser}
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
          title="Profile"
          userProfile={currentUser}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        />

        <main className="p-4 lg:p-8">
          <UserProfile userId={userId} currentUserId={currentUser.id} />
        </main>
      </div>
    </div>
  )
}

export default UserProfilePage