'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'

const ProfileEditPage: React.FC = () => {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const goBack = () => {
    router.back()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner size="lg" text="인증 확인 중..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">프로필을 편집하려면 먼저 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={goBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="font-medium hidden sm:block">뒤로</span>
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">프로필 편집</h1>
            </div>

            <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
          </div>
        </div>
      </header>

      {/* 프로필 편집 폼 */}
      <main className="py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {user?.name || '사용자'}님의 프로필
              </h2>
              <p className="text-gray-500">프로필 정보를 편집할 수 있습니다</p>
            </div>

            {/* 임시 메시지 */}
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">프로필 편집 기능</h3>
              <p className="text-gray-500 mb-6">
                프로필 편집 기능은 현재 개발 중입니다.<br />
                곧 사용자 이름, 프로필 이미지, 소개 등을 편집할 수 있게 됩니다.
              </p>
              <button
                onClick={goBack}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 모바일 하단 공간 */}
      <div className="h-20 md:hidden"></div>
    </div>
  )
}

export default ProfileEditPage