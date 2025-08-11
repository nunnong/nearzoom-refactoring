'use client'

import React from 'react'
import { useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import FeedEditor from '@/components/page/feed/FeedEditor'
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

const FeedEditPage: React.FC = () => {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const userProfile = mockUserProfile // TODO: useAuth() 훅으로 교체

  const handleSave = async () => {
    setIsSaving(true)
    
    // TODO: 실제 저장 로직 구현
    setTimeout(() => {
      setIsSaving(false)
      router.push('/feed')
    }, 1000)
  }

  const handleCancel = () => {
    if (confirm('변경사항이 저장되지 않습니다. 정말 나가시겠습니까?')) {
      router.push('/feed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 상단 편집 헤더 */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="취소"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">피드 편집</h1>
              <p className="text-sm text-gray-500">{userProfile.name}의 피드</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  저장 중...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 편집 영역 */}
      <main className="h-[calc(100vh-73px)]">
        <FeedEditor userId={userProfile.id} />
      </main>
    </div>
  )
}

export default FeedEditPage