// =============================================================================
// 📁 /app/my/page.tsx - 수정 완료 버전
// =============================================================================

import React from 'react'
import type { JSX } from 'react'
import { Metadata } from 'next'

// 🔥 올바른 import 경로로 수정 (default export 사용)
import MyProfile from '@/components/page/profile/MyProfile'

// ============================================================================
// 메타데이터
// ============================================================================

export const metadata: Metadata = {
  title: '내 프로필 | PhotoShare',
  description: '내 프로필과 게시물을 확인하고 관리하세요.',
  keywords: ['프로필', '내 계정', '게시물', '팔로워', '팔로잉'],
  openGraph: {
    title: '내 프로필 | PhotoShare',
    description: '내 프로필과 게시물을 확인하고 관리하세요.',
    type: 'profile',
  }
}

// ============================================================================
// 내 프로필 페이지 컴포넌트
// ============================================================================

const MyProfilePage: React.FC = (): JSX.Element => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              내 프로필
            </h1>
            <p className="text-gray-600">
              내 정보와 게시물을 확인하고 관리하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* MyProfile 컴포넌트 */}
          <MyProfile 
            className="w-full"
            postsPerPage={12}
            enableAutoLoad={true}
          />
        </div>
      </div>

      {/* 푸터 여백 */}
      <div className="h-16" />
    </div>
  )
}

export default MyProfilePage