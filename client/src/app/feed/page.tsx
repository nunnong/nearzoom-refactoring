'use client'

import React from 'react'
import { useState } from 'react'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import FeedViewer from '@/components/page/feed/FeedViewer'
import { UserInfo } from '@/utils/auth'

// 🔥 완전한 UserInfo 타입 (provider, accessToken 추가)
const mockUserProfile: UserInfo = {
  id: '1',
  name: '김다꾸',
  email: 'user@example.com',
  profileImage: undefined,
  provider: 'kakao', // 🔥 추가
  accessToken: 'mock_access_token' // 🔥 추가
}

const MyFeedPage: React.FC = () => {
  const router = useRouter()
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

  const handleEditFeed = (): void => {
    router.push('/feed/edit')
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
          title="My Feed"
          userProfile={userProfile}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        >
          {/* 편집 버튼 */}
          <button
            onClick={handleEditFeed}
            className="inline-flex h-[44px] px-4 py-2.5 items-center gap-2 rounded-md bg-blue-600 text-base font-semibold text-white shadow-inner shadow-white/10 hover:bg-blue-700 focus:outline-none transition-colors"
          >
            <PencilSquareIcon className="h-5 w-5" />
            <span className="hidden sm:block">Edit Feed</span>
          </button>
        </EnhancedHeader>

        <main className="h-[calc(100vh-120px)]">
          {/* 🔥 isEditable 속성 제거 (FeedViewer Props에 없음) */}
          <FeedViewer userId={userProfile.id} />
        </main>
      </div>
    </div>
  )
}

export default MyFeedPage