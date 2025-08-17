'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// Explore 페이지 메인 컴포넌트
const ExplorePage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();

  // 🏗️ 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner
          size="lg"
          text="인증 확인 중..."
        />
      </div>
    );
  }

  // 🏗️ 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">탐색 페이지를 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MyRoomHeader로 통일 */}
      <MyRoomHeader
        user={{
          name: user.name,
          email: user.email,
          profileImage: user.profileImage
        }}
        onUploadSelfie={() => {
          // 셀피 업로드 기능 (필요시 구현)
          console.log('Upload selfie clicked')
        }}
        onAccount={() => router.push('/profile')}
        onLogout={() => {
          // 로그아웃 기능 (필요시 구현)
          console.log('Logout clicked')
        }}
      />

      {/* 메인 컨텐츠 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              탐색
            </h1>
            <p className="text-gray-600 mb-8">
              새로운 사용자와 흥미로운 게시물을 발견하세요
            </p>
            
            {/* 임시 컨텐츠 */}
            <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">탐색 준비 중</h3>
              <p className="text-gray-500">곧 새로운 사용자와 게시물을 탐색할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ExplorePage