'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import HomeButton from '@/components/page/myroom/HomeButton'
import LogoutButton from '@/components/page/myroom/LogoutButton'
import MainNavigation from './MainNavigation'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// 백엔드 User 정보 (실제 사용자 데이터)
interface BackendUserProfile {
  userId: number;
  userName: string;
  userEmail: string;
  accountName: string;
  profileImage?: string;
  socialType: string;
}

// 헤더에서 사용할 사용자 타입 (간소화)
interface HeaderUser {
  id: number;
  name: string;
  email: string;
  accountName: string;
  profileImage?: string;
  avatar?: string; // profileImage alias
}

interface EnhancedHeaderProps {
  title?: string;
  userProfile?: HeaderUser | null; // 외부에서 전달받은 사용자 정보 (선택적)
  onMenuToggle?: () => void;
  showNavigation?: boolean;
  showUserInfo?: boolean; // 사용자 정보 표시 여부
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const headerAPI = {
  // GET /users/me - 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<BackendUserProfile> => {
    const response = await api.get<ApiResponse<BackendUserProfile>>('/users/me');
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // POST /auth/logout - 로그아웃 (필요시)
  logout: async (): Promise<void> => {
    try {
      await api.post<ApiResponse<void>>('/auth/logout');
    } catch (error) {
      // 로그아웃 실패해도 로컬 상태는 클리어
      console.warn('Backend logout failed, but clearing local state:', error);
    }
  },
};

// ============================================================================
// EnhancedHeader 컴포넌트
// ============================================================================

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  title,
  userProfile: externalUserProfile,
  onMenuToggle,
  showNavigation = true,
  showUserInfo = true,
  children,
  className = '',
}) => {
  const router = useRouter();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // 🔥 인증 훅 사용 (Zustand 기반)
  const { user: authUser, isAuthenticated, logout: authLogout } = useAuth();

  // ============================================================================
  // 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null);
      return;
    }

    setIsLoadingUser(true);
    setUserError(null);

    try {
      console.log('=== 헤더에서 사용자 정보 로드 시작 ===');

      const backendUser = await headerAPI.getCurrentUser();
      
      // 백엔드 응답을 HeaderUser 형식으로 변환
      const headerUser: HeaderUser = {
        id: backendUser.userId,
        name: backendUser.userName,
        email: backendUser.userEmail,
        accountName: backendUser.accountName,
        profileImage: backendUser.profileImage,
        avatar: backendUser.profileImage, // alias
      };

      setCurrentUser(headerUser);
      
      console.log('=== 헤더 사용자 정보 로드 완료 ===', headerUser);

    } catch (error) {
      console.error('Failed to load current user in header:', error);
      const errorMessage = error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.';
      setUserError(errorMessage);
      
      // 인증 오류인 경우 로그아웃 처리
      if (error instanceof Error && error.message.includes('401')) {
        authLogout();
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, authLogout]);

  // ============================================================================
  // 초기 로드 및 인증 상태 변경 감지
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && !externalUserProfile) {
      loadCurrentUser();
    } else if (!isAuthenticated) {
      setCurrentUser(null);
      setUserError(null);
    }
  }, [isAuthenticated, externalUserProfile, loadCurrentUser]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleMyDiaryClick = useCallback(() => {
    router.push('/');
  }, [router]);

  // 🔥 백엔드 연동 로그아웃
  const handleLogout = useCallback(async () => {
    try {
      console.log('=== 헤더에서 로그아웃 시작 ===');
      
      // 백엔드 로그아웃 API 호출
      await headerAPI.logout();
      
      // 로컬 인증 상태 클리어
      authLogout();
      
      // 홈으로 리다이렉트
      router.push('/');
      
      console.log('=== 로그아웃 완료 ===');
      
    } catch (error) {
      console.error('Logout failed:', error);
      // 실패해도 로컬 상태는 클리어
      authLogout();
      router.push('/');
    }
  }, [authLogout, router]);

  const handleProfileClick = useCallback(() => {
    if (currentUser || externalUserProfile) {
      router.push('/profile');
    }
  }, [currentUser, externalUserProfile, router]);

  const handleRetryUserLoad = useCallback(() => {
    setUserError(null);
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ============================================================================
  // 사용자 정보 결정 (외부 전달 > 로드된 사용자 > 인증 사용자)
  // ============================================================================

  const displayUser = externalUserProfile || currentUser || (authUser ? {
    id: typeof authUser.id === 'string' ? parseInt(authUser.id) : authUser.id,
    name: authUser.name || authUser.email,
    email: authUser.email,
    accountName: (authUser as any)?.accountName || authUser.email.split('@')[0],
    profileImage: (authUser as any)?.profileImage,
    avatar: (authUser as any)?.profileImage,
  } : null);

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <header className={`border-b bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {/* MyDiary 브랜드 - 왼쪽 상단 */}
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleMyDiaryClick}
          >
            <span className="text-xl font-semibold text-blue-600">📖 MyDiary</span>
          </div>

          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          
          {title && (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
          
          {children}
        </div>

        {/* 중앙 네비게이션 */}
        {showNavigation && (
          <div className="hidden lg:block">
            <MainNavigation variant="header" />
          </div>
        )}

        {/* 우측 영역 */}
        <div className="flex items-center space-x-3">
          {/* 🔥 사용자 정보 표시 (백엔드 연동) */}
          {showUserInfo && isAuthenticated && (
            <div className="flex items-center space-x-3">
              {/* 사용자 프로필 */}
              {displayUser && (
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                  onClick={handleProfileClick}
                >
                  {/* 프로필 이미지 */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {displayUser.profileImage || displayUser.avatar ? (
                      <img
                        src={displayUser.profileImage || displayUser.avatar}
                        alt={displayUser.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                        {displayUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* 사용자 이름 (데스크톱에서만 표시) */}
                  <div className="hidden md:block text-right">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-24">
                      {displayUser.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-24">
                      @{displayUser.accountName}
                    </div>
                  </div>
                </div>
              )}

              {/* 로딩 상태 */}
              {isLoadingUser && !displayUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="hidden md:block">
                    <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="w-12 h-2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* 에러 상태 */}
              {userError && !displayUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={handleRetryUserLoad}
                    className="hidden md:block text-xs text-red-600 hover:text-red-800 underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 기존 버튼들 */}
          <HomeButton />
          
          {/* 🔥 백엔드 연동 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label="로그아웃"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      {showNavigation && (
        <div className="border-t bg-gray-50 px-4 py-2 lg:hidden">
          <MainNavigation variant="header" className="justify-center" />
        </div>
      )}

      {/* 개발 모드에서 사용자 정보 디버깅 */}
      {process.env.NODE_ENV === 'development' && displayUser && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-xs">
          <details>
            <summary className="cursor-pointer text-yellow-800 font-medium">
              🔧 사용자 정보 (개발용)
            </summary>
            <div className="mt-2 text-yellow-700 space-y-1">
              <div>ID: {displayUser.id}</div>
              <div>이름: {displayUser.name}</div>
              <div>계정명: {displayUser.accountName}</div>
              <div>이메일: {displayUser.email}</div>
              <div>인증됨: {isAuthenticated ? 'Yes' : 'No'}</div>
              <div>소스: {externalUserProfile ? 'External' : currentUser ? 'Backend' : 'Auth'}</div>
            </div>
          </details>
        </div>
      )}
    </header>
  )
}

export default EnhancedHeader