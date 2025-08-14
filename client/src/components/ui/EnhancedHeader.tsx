// src/components/ui/EnhancedHeader.tsx - 백엔드 연동 완료

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import HomeButton from '@/components/page/myroom/HomeButton'
import MainNavigation from './MainNavigation'
import axios from 'axios'

// ============================================================================
// 백엔드 연동 설정
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 인증 토큰 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      // 401 에러 시 자동 로그아웃하지 않고 에러만 전파 (헤더에서는)
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식 (기존 타입 시스템과 일치)
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 백엔드 User 정보 (실제 사용자 데이터)
interface BackendUserProfile {
  userId: number;
  userName: string;
  userEmail: string;
  accountName: string;
  profileImage?: string;
  socialType?: string;
  prettyFace?: string;
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
  // 🔥 GET /users/me - 현재 사용자 정보 조회 (백엔드 API 확인 필요)
  getCurrentUser: async (): Promise<BackendUserProfile> => {
    try {
      // 먼저 /users/me 시도, 없으면 다른 엔드포인트 시도
      const response = await api.get<ApiResponse<BackendUserProfile>>('/users/me');
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 정보를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('사용자 데이터가 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      // /users/me가 없으면 /auth/me 또는 다른 엔드포인트 시도
      try {
        const fallbackResponse = await api.get<ApiResponse<BackendUserProfile>>('/auth/me');
        if (fallbackResponse.data.error) {
          throw new Error(fallbackResponse.data.message || '사용자 정보를 가져올 수 없습니다.');
        }
        return fallbackResponse.data.data!;
      } catch (fallbackError) {
        console.error('Failed to get current user from both endpoints:', error, fallbackError);
        throw error;
      }
    }
  },

  // 🔥 POST /auth/logout - 로그아웃
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

    // 이미 외부에서 사용자 정보가 제공된 경우 스킵
    if (externalUserProfile) {
      setCurrentUser(externalUserProfile);
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
      
      console.log('✅ 헤더 사용자 정보 로드 완료:', headerUser);

    } catch (error) {
      console.error('❌ 헤더 사용자 정보 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.';
      setUserError(errorMessage);
      
      // 심각한 인증 오류인 경우에만 로그아웃 (401 등)
      if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('토큰')
      )) {
        console.log('🔓 인증 오류로 인한 자동 로그아웃');
        authLogout();
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, externalUserProfile, authLogout]);

  // ============================================================================
  // 초기 로드 및 인증 상태 변경 감지
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUser();
    } else {
      setCurrentUser(null);
      setUserError(null);
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, loadCurrentUser]);

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
      
      console.log('✅ 백엔드 로그아웃 완료');
      
    } catch (error) {
      console.error('❌ 백엔드 로그아웃 실패:', error);
      // 실패해도 로컬 상태는 클리어
    } finally {
      // 로컬 인증 상태 클리어
      authLogout();
      
      // 사용자 상태 초기화
      setCurrentUser(null);
      setUserError(null);
      
      // 홈으로 리다이렉트
      router.push('/');
      
      console.log('✅ 로그아웃 완료');
    }
  }, [authLogout, router]);

  const handleProfileClick = useCallback(() => {
    const user = displayUser;
    if (user) {
      // 사용자 프로필 페이지로 이동 (accountName 기반)
      router.push(`/profile/${user.accountName}`);
    }
  }, [router]);

  const handleRetryUserLoad = useCallback(() => {
    setUserError(null);
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ============================================================================
  // 사용자 정보 결정 (우선순위: 외부 전달 > 로드된 사용자 > 인증 사용자)
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
              {displayUser && !isLoadingUser && (
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                  onClick={handleProfileClick}
                  title={`${displayUser.name} 프로필 보기`}
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
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                              ${displayUser.name.charAt(0).toUpperCase()}
                            </div>
                          `;
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
              {isLoadingUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="hidden md:block">
                    <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="w-12 h-2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* 에러 상태 */}
              {userError && !displayUser && !isLoadingUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={handleRetryUserLoad}
                    className="hidden md:block text-xs text-red-600 hover:text-red-800 underline"
                    title={userError}
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
          {isAuthenticated && (
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
          )}

          {/* 로그인되지 않은 경우 로그인 버튼 */}
          {!isAuthenticated && (
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      {showNavigation && (
        <div className="border-t bg-gray-50 px-4 py-2 lg:hidden">
          <MainNavigation variant="header" className="justify-center" />
        </div>
      )}

      {/* 개발 모드에서 사용자 정보 디버깅 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-xs">
          <details>
            <summary className="cursor-pointer text-yellow-800 font-medium">
              🔧 헤더 상태 (개발용)
            </summary>
            <div className="mt-2 text-yellow-700 space-y-1">
              <div><strong>인증 상태:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
              <div><strong>로딩 중:</strong> {isLoadingUser ? 'Yes' : 'No'}</div>
              <div><strong>에러:</strong> {userError || 'None'}</div>
              {displayUser && (
                <>
                  <div><strong>표시 사용자:</strong></div>
                  <div className="ml-4">
                    <div>ID: {displayUser.id}</div>
                    <div>이름: {displayUser.name}</div>
                    <div>계정명: {displayUser.accountName}</div>
                    <div>이메일: {displayUser.email}</div>
                    <div>소스: {externalUserProfile ? 'External' : currentUser ? 'Backend' : 'Auth'}</div>
                  </div>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </header>
  )
}

export default EnhancedHeader