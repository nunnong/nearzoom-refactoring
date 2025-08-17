// src/components/ui/EnhancedHeader.tsx - 아키텍처 원칙 완전 준수

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import MainNavigation from './MainNavigation'

// 🔥 아키텍처 원칙 준수: 인터셉터가 적용된 axios 인스턴스 사용

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 User 정보 (실제 UserProfileResponse 타입과 일치)
// interface BackendUserProfile { ... } // 외부 호출 제거로 불필요

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


// 헤더에서는 추가 백엔드 호출을 하지 않고, 전달/스토어의 사용자 정보만 사용

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, className = '' }) => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-16 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center h-16 bg-red-50 border border-red-200 ${className}`}>
        <div className="flex items-center space-x-3">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-600 text-sm font-medium">로그인이 필요합니다</span>
          <button
            onClick={handleLogin}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// EnhancedHeader 컴포넌트 (인증 보호 적용)
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

  // 🔥 아키텍처 원칙 준수: Zustand 기반 인증 훅 사용
  const { user: authUser, isAuthenticated, logout: authLogout } = useAuth();

  // ============================================================================
  // 🔥 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null)
      return
    }

    // 외부 제공 > Zustand 사용자 > 기존 상태 순
    const sourceUser = externalUserProfile || authUser || null
    if (!sourceUser) {
      setCurrentUser(null)
      return
    }

    const headerUser: HeaderUser = {
      id: (sourceUser as any).id,
      name: (sourceUser as any).name,
      email: (sourceUser as any).email,
      accountName: (sourceUser as any).accountName || ((sourceUser as any).email || '').split('@')[0],
      profileImage: (sourceUser as any).profileImage,
      avatar: (sourceUser as any).profileImage,
    }
    setCurrentUser(headerUser)
    setUserError(null)
  }, [isAuthenticated, externalUserProfile, authUser])

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

  // 🔥 백엔드 연동 로그아웃 (Zustand 토큰 관리 사용)
  const handleLogout = useCallback(async () => {
    // 서버 호출 없이 로컬 로그아웃만 수행 (전역 로직에 위임)
    authLogout()
    setCurrentUser(null)
    setUserError(null)
    router.push('/')
  }, [authLogout, router])

  // 🔥 프로필 클릭 - 백엔드 연동
  const handleProfileClick = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const user = displayUser;
    if (!user) return;

    // 추가 API 확인 없이 라우팅만 수행
    router.push(`/profile/${user.accountName}`)
  }, [router, isAuthenticated]);

  const handleRetryUserLoad = useCallback(() => {
    setUserError(null);
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ============================================================================
  // 🔥 사용자 정보 결정 (우선순위: 외부 전달 > 로드된 사용자 > 인증 사용자)
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
  // 렌더링 (AuthGuard로 보호)
  // ============================================================================

  const renderContent = () => (
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

          {/* 기존 버튼 제거됨 */}
          
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

      
    </header>
  );

  return (
    <AuthGuard className={className}>
      {renderContent()}
    </AuthGuard>
  );
};

export default EnhancedHeader