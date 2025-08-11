'use client'

import React from 'react'
import { useState } from 'react'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import ExploreRandom from '@/components/page/explore/ExploreRandom'
import { UserInfo } from '@/utils/auth'

// 🔥 완전한 UserInfo 타입에 맞춘 mock 데이터
const mockUserProfile: UserInfo = {
  id: '1',
  name: '김다꾸',
  email: 'user@example.com',
  profileImage: undefined,
  provider: 'kakao', // 🔥 추가
  accessToken: 'mock_access_token' // 🔥 추가
}

const ExplorePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const userProfile = mockUserProfile // TODO: useAuth() 훅으로 교체

  const handleUploadSelfie = (): void => {
    // 기존 마이룸의 업로드 기능 재사용
    const currentPath = window.location.pathname
    const returnUrl = encodeURIComponent(currentPath)
    window.location.href = `/upload-selfie?returnUrl=${returnUrl}`
  }

  const handleAccount = (): void => {
    // TODO: 계정 설정 모달 구현
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
          title="Explore"
          userProfile={userProfile}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        />

        <main className="p-4 lg:p-8">
          <ExploreRandom />
        </main>
      </div>
    </div>
  )
}

export default ExplorePage