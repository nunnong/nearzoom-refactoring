// =============================================================================
// �� /app/my/page.tsx - MyRoomHeader 적용 버전
// =============================================================================

'use client';

import React, { useEffect } from 'react';
import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

// 🔥 올바른 import 경로로 수정 (default export 사용)
import MyProfile from '@/components/page/profile/MyProfile';
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader';

// ============================================================================
// 내 프로필 페이지 컴포넌트
// ============================================================================

const MyProfilePage: React.FC = (): JSX.Element => {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();

  // 🔥 리다이렉트 로직: 내 이메일과 accountName이 같으면 /my로 유지
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      console.log('🔍 내 프로필 페이지 접근:', { 
        userEmail: user.email,
        userAccountName: (user as any)?.accountName 
      });
      // 여기서는 이미 /my이므로 추가 리다이렉트 불필요
    } else if (!authLoading && !isAuthenticated) {
      console.log('🔒 인증되지 않은 사용자, 로그인 페이지로 리다이렉트');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 🏗️ 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
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
          <p className="text-gray-500 mb-6">내 프로필을 보려면 로그인해 주세요.</p>
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
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* MyProfile 컴포넌트 */}
          <MyProfile 
            className="w-full"
            postsPerPage={12}
          />
        </div>
      </div>

      {/* 푸터 여백 */}
      <div className="h-16" />
    </div>
  );
};

export default MyProfilePage;